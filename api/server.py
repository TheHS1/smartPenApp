import cairosvg
import logging
from flask import Flask, request, jsonify, send_from_directory, current_app
import os
from latex_plugin import latex
from ocr_model import ocr
from sentiment_plugin import sentiment

# turn the path and text data into proper svg xml string
def create_svg_string(paths, viewbox):
    if ('minx' not in viewbox or 'miny' not in viewbox or 'width' not in viewbox or 'height' not in viewbox):
        logging.exception("Viewbox not properly defined")
        return;
    svg_elements = []
    # Basic SVG structure
    svg_header = f'<svg width="{viewbox['width']}" height="{viewbox['height']}" viewBox="{viewbox['minx']} {viewbox['miny']} {viewbox['width']} {viewbox['height']}" xmlns="http://www.w3.org/2000/svg">'

    # Add path elements based on type
    for path_info in paths:
        strokeSize = path_info.get("strokeSize", 1);
        color = path_info.get("color", "black")
        if path_info.get("type") == "text":
            x = path_info.get("x", 0)
            y = path_info.get("y", 0)
            content = path_info.get("data", "")
            dy=strokeSize*0.75
            svg_elements.append(f'<text x="{x}" y="{y}" fill="{color}" font-size="{strokeSize}" dy="{dy}">{content}</text>')
        else:
            path_data = path_info.get("data", "")
            erase = path_info.get("erase", "false")
            finalColor = "white" if erase else color
            svg_elements.append(f'<path d="{path_data}" stroke="{finalColor}" fill="none" stroke-width="{strokeSize}"/>')

    svg_footer = '</svg>'
    return "\n".join([svg_header] + svg_elements + [svg_footer])

# Flask Application
app = Flask(__name__)
logging.basicConfig(level=logging.INFO) # Set logging level

# endpoint to process the svg and plugins
@app.route('/process_svg', methods=['POST'])
def process_ocr_request():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()

    # Basic Input Validation
    if not data or 'svgPaths' not in data or 'viewbox' not in data:
        return jsonify({"error": "Missing 'svgPaths' or 'viewbox' or 'ocrData' in JSON input"}), 400

    svg_paths = data.get('svgPaths', [])
    viewbox = data.get('viewbox', {})

    # generate the svg
    try:
        svg_string = create_svg_string(svg_paths, viewbox)
    except Exception as e:
        logging.exception("Error generating SVG string")
        return jsonify({"error": f"Failed to generate SVG: {e}"}), 500

    # turn the svg into png for ocr
    png_data = None
    try:
        svg_bytes = svg_string.encode('utf-8')
        # Render SVG to PNG using cairo
        png_data = cairosvg.svg2png(bytestring=svg_bytes)

        # with open("output.png", "wb") as f:
        #     f.write(png_data)

    except Exception as e:
        logging.exception("Error turning SVG to PNG")
        return jsonify({"error": f"Failed to turn SVG into png: {e}"}), 500

    # Perform OCR
    ocr_results = None
    if png_data:
        try:
            ocr_results = ocr(png_data)
        except Exception as e:
            logging.exception("Failed to OCR")
            return jsonify({"error": f"Failed to do OCR: {e}"}), 500
    else:
        logging.exception("Failed to OCR")
        return jsonify({"error": f"Failed to do OCR"}), 500

    # Return ocr results
    final_response = {
        "ocr_results": ocr_results,
    }
    print(final_response)
    return jsonify(final_response)

@app.route('/latex_plugin', methods=['POST'])
def get_latex():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    # Basic Input Validation
    if 'options' not in data or 'ocrData' not in data:
        return jsonify({"error": "Missing 'options' or 'ocrData' in JSON input"}), 400

    options = data.get('options', [])
    ocrData = data.get('ocrData', '')

    result = latex(ocrData, options)

    # Return pdf back to user
    directory = os.path.join(current_app.root_path, result)

    if not os.path.isfile(directory):
        logging.exception(f"Requested file {result} does not exist")
        return jsonify({"error": f"Error returning file back"}), 404

    return send_from_directory(
        directory=os.path.join(current_app.root_path),
        path=result,
        as_attachment=True,
        mimetype='application/pdf'
    )

@app.route('/sentiment_plugin', methods=['POST'])
def get_sentiment():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    # Basic Input Validation
    if 'sentimentData' not in data:
        return jsonify({"error": "Missing 'options' or 'sentimentData' in JSON input"}), 400

    options = data.get('options', [])
    sentimentData = data.get('sentimentData', '')

    result = sentiment(sentimentData);

    # Return ocr results
    final_response = {
        "sentiment_results": result,
    }
    return jsonify(final_response)


if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=False, port=5000)
