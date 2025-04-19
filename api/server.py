import cairosvg
import io
import json
import logging
from flask import Flask, request, jsonify
import torch
from transformers import AutoProcessor, AutoModelForCausalLM
from PIL import Image

SVG_WIDTH = 500  # width of svg 
SVG_HEIGHT = 500 # height of svg

# Some plugins must be executed before others so we define an order
PLUGIN_ORDER = [
    "sentiment",
    "latex",
]

# hold ocr model so it doesn't have to be loaded over and over
model = None
processor = None

def ocr(image_data_bytes):
    image_file = io.BytesIO(image_data_bytes)
    image = Image.open(image_file)
    if image.mode == "RGBA":
        # Create a new RGB image with a white background
        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
        # Paste the RGBA image onto the white background
        rgb_image.paste(image, mask=image.split()[3])  # Use the alpha channel as a mask
        image = rgb_image
    elif image.mode != "RGB":
        image = image.convert("RGB")  # Convert other modes to RGB

    # Define the prompt for OCR
    prompt = '<OCR_WITH_REGION>'
    inputs = processor(text=prompt, images=image, return_tensors="pt")

    # Move tensors to the correct device and dtype
    inputs = {
        k: v.to(device=device, dtype=torch.int64) if k == "input_ids" else v.to(device=device, dtype=torch.float32)
        if torch.is_tensor(v) else v
        for k, v in inputs.items()
    }

    # Generate the output using the model
    generated_ids = model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=4096,
        num_beams=3
    )

    # Decode and return the generated text and bounds
    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
    parsed_answer = processor.post_process_generation(generated_text, task=prompt, image_size=(image.width, image.height))
    return parsed_answer['<OCR_WITH_REGION>']['labels']

# Plugin Functions
# context contains results from previous plugins in case data is needed
def sentiment(plugin_data, plugin_options, context):
    return {"emotion": "The user is very happy :)"}

def latex(plugin_data, plugin_options, context):
    return {"latex_output": "well formatted pdf"}

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
        return jsonify({"error": f"Failed to do OCR: {e}"}), 500

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
    return jsonify(final_response)

if __name__ == '__main__':
    # Load ocr model
    device = "cpu"
    torch_dtype = torch.float32  # Keep pixel values as float32

    # Load the model and processor
    model = AutoModelForCausalLM.from_pretrained("microsoft/Florence-2-base", trust_remote_code=True).to(device)
    processor = AutoProcessor.from_pretrained("microsoft/Florence-2-base", trust_remote_code=True)

    # Run Flask dev server (for production, use a proper WSGI server like gunicorn/waitress)
    app.run(host="0.0.0.0", debug=True, port=5000)
