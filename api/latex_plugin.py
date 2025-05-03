import logging
import os
import re
from latexcompiler import LC
import mistletoe
from mistletoe.latex_renderer import LaTeXRenderer

def latex(data, plugin_options):
    logging.info("Generating latex file")

    # Remove </s> from response
    rendered = mistletoe.markdown(data.replace("</s>", ""), LaTeXRenderer)

    # Remove the article start document and end document lines since unneeded
    lines = rendered.splitlines()

    # filter out usepackages (user should import necessary packages in their template)
    lines = [line for line in lines if "usepackage" not in line];
    if len(lines) >= 3:
        rendered = "\n".join(lines[2:-1])

    # / creates problem for regular expression, double them up to escape
    rendered = rendered.replace('\\', '\\\\')

    # Path to your LaTeX file
    directory = os.path.dirname(os.path.abspath(__file__))
    tex_file = os.path.join(directory, 'tmp', 'semester.tex')

    # Read the content of the LaTeX file
    with open(tex_file, 'r') as f:
        tex_content = f.read()

    # Define a regular expression pattern to match the content inside penContent
    pattern = r'\\begin{penContent}.*?\\end{penContent}'

    # Replace the matched content with new content
    new_tex_content = re.sub(pattern, rendered, tex_content, flags=re.DOTALL)

    # Write the modified content back to the file
    output_file = os.path.join(directory, 'tmp', 'output.tex')
    with open(output_file, 'w') as f:
        f.write(new_tex_content)

    try:
        LC.compile_document(tex_engine = 'pdflatex', bib_engine = 'biber', no_bib=True, path=output_file, folder_name = '.aux_files')
    except:
        print("bad latex data")

    return 'tmp/output.pdf'
