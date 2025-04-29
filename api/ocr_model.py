import io
from PIL import Image
import torch
from transformers import AutoProcessor, AutoModelForCausalLM
import logging

# hold ocr model so it doesn't have to be loaded over and over
model = None
processor = None
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

# load the ocr model as soon as the module is loaded
try:
    model = AutoModelForCausalLM.from_pretrained("microsoft/Florence-2-large", trust_remote_code=True).to(device, torch_dtype)
    processor = AutoProcessor.from_pretrained("microsoft/Florence-2-large", trust_remote_code=True)
    logging.info("Loaded OCR model")
except Exception as e:
    logging.error(f"Error loading OCR model: {e}")
    model = None
    processor = None


def ocr(image_data_bytes):
    if model is None or processor is None:
        logging.exception("Model not loaded before OCR")

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
    inputs = processor(text=prompt, images=image, return_tensors="pt").to(device, torch_dtype)

    # Move tensors to the correct device and dtype
    # inputs = {
    #     k: v.to(device=device, dtype=torch.int64) if k == "input_ids" else v.to(device=device, dtype=torch.float32)
    #     if torch.is_tensor(v) else v
    #     for k, v in inputs.items()
    # }

    # Generate the output using the model
    with torch.no_grad():
        generated_ids = model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=4096,
            num_beams=3,
            do_sample=False
        )

    # Decode and return the generated text and bounds
    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
    parsed_answer = processor.post_process_generation(generated_text, task=prompt, image_size=(image.width, image.height))
    print(parsed_answer)
    return parsed_answer['<OCR_WITH_REGION>']['labels']

