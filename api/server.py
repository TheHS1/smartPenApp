import cairosvg
import logging
from flask import Flask, request, jsonify, send_from_directory, current_app
import os
from latex_plugin import latex
from ocr_model import ocr
from sentiment_plugin import sentiment

SVG_WIDTH = 500  # width of svg 
SVG_HEIGHT = 500 # height of svg

# Some plugins must be executed before others so we define an order
PLUGIN_ORDER = [
    "sentiment",
    "latex",
]

# Maps plugin names to implementation functions
PLUG_MAP = {
    "sentiment": sentiment,
    "latex": latex,
}

# turn the path and text data into proper svg xml string
def create_svg_string(paths, width=SVG_WIDTH, height=SVG_HEIGHT):
    svg_elements = []
    # Basic SVG structure
    svg_header = f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">'

    # Add path elements based on type
    for path_info in paths:
        if path_info.get("type") == "text":
            x = path_info.get("x", 0)
            y = path_info.get("y", 0)
            content = path_info.get("data", "")
            svg_elements.append(f'<text x="{x}" y="{y}" fill="black">{content}</text>')
        else:
            path_data = path_info.get("data", "")
            svg_elements.append(f'<path d="{path_data}" stroke="black" fill="none" />')

    svg_footer = '</svg>'
    return "\n".join([svg_header] + svg_elements + [svg_footer])

# Flask Application
app = Flask(__name__)
logging.basicConfig(level=logging.INFO) # Set logging level

# endpoint to process the svg and plugins
@app.route('/process_svg', methods=['POST'])
def process_svg_request():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()

    # Basic Input Validation
    if not data or 'svgPaths' not in data or 'plugins' not in data:
        return jsonify({"error": "Missing 'svgPaths' or 'plugins' in JSON input"}), 400

    svg_paths = data.get('svgPaths', [])
    plugin_config = data.get('plugins', {})
    enabled_plugins = plugin_config.get('enabled', [])

    # generate the svg
    try:
        svg_string = create_svg_string(svg_paths)
    except Exception as e:
        logging.exception("Error generating SVG string")
        return jsonify({"error": f"Failed to generate SVG: {e}"}), 500

    # turn the svg into png for ocr
    png_data = None
    try:
        svg_bytes = svg_string.encode('utf-8')
        # Render SVG to PNG using cairo
        png_data = cairosvg.svg2png(bytestring=svg_bytes)

        #with open("output.png", "wb") as f:
        #    f.write(png_data)

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

    # Execute plugins in desired order
    plugin_results = {}

    # This structure holds data needed by plugins
    sharedData = {
        "svg_string": svg_string,
        "png_data": png_data, # Pass image
        "ocr_results": ocr_results, # Pass OCR results
    }

    enabled_plugins_map = {p['name']: p for p in enabled_plugins}

    # Iterate through the predefined order
    for plugin_name in PLUGIN_ORDER:
        if plugin_name in enabled_plugins_map:
            if plugin_name in PLUG_MAP:
                plugin_info = enabled_plugins_map[plugin_name]
                plugin_func = PLUG_MAP[plugin_name]
                try:
                    # Call the plugin function
                    result = plugin_func(
                        plugin_data=plugin_info.get('data', {}),
                        plugin_options=plugin_info.get('options', {}),
                        context=sharedData
                    )
                    plugin_results[plugin_name] = result
                except Exception as e:
                    logging.exception(f"Error executing plugin: {plugin_name}")
                    plugin_results[plugin_name] = {"error": f"Plugin execution failed: {e}"}
            else:
                print(f"Plugin '{plugin_name}' is in json but not in plugin map")
                plugin_results[plugin_name] = {"status": "Not implemented"}

    # Return plugin and ocr results
    final_response = {
        "ocr_results": ocr_results,
        "plugin_outputs": plugin_results
    }
    print(final_response)
    return jsonify(final_response)

# For downloading the latex pdf file
@app.route('/download-pdf/<filename>', methods=['GET'])
def download_pdf(filename):
    print(f"Attempting to serve PDF: {filename}")

    directory = os.path.join(current_app.root_path, 'tmp')

    if not os.path.isfile(os.path.join(directory, filename)):
        logging.exception(f"Requested file {filename} does not exist")
        return jsonify({"error": f"Requested file {filename} does not exist"}), 404

    return send_from_directory(
        directory=os.path.join(current_app.root_path, 'tmp'),
        path=filename,
        as_attachment=True,
        mimetype='application/pdf'
    )

if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True, port=5000)
