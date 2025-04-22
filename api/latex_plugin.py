import logging
import os
import re
from latexcompiler import LC

def latex(plugin_data, plugin_options, context):
    logging.info("Generating latex file")
    if "ocr_results" in context:
        content = " ".join(context["ocr_results"]).replace("</s>", "");
    else:
        logging.exception("Error generating pdf using ocr results")
        return

    # Path to your LaTeX file
    directory = os.path.dirname(os.path.abspath(__file__))
    tex_file = os.path.join(directory, 'tmp', 'semester.tex')

    # Read the content of the LaTeX file
    with open(tex_file, 'r') as f:
        tex_content = f.read()

    # Define a regular expression pattern to match the content inside penContent
    pattern = r'\\begin{penContent}.*?\\end{penContent}'

    # Replace the matched content with your new content (escaping LaTeX special chars if necessary)
    new_tex_content = re.sub(pattern, content, tex_content, flags=re.DOTALL)

    # Write the modified content back to the file
    output_file = os.path.join(directory, 'tmp', 'output.tex')
    with open(output_file, 'w') as f:
        f.write(new_tex_content)

    LC.compile_document(tex_engine = 'pdflatex', bib_engine = 'biber', no_bib=True, path=output_file, folder_name = '.aux_files')

    return {"pdf_path": 'tmp/output.pdf'}
