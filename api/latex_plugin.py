import logging
import os
import re
from latexcompiler import LC
import mistletoe
from mistletoe.latex_renderer import LaTeXRenderer

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

def check_point(centerX, centerY, x1, y1, x2, y2, x3, y3, x4, y4): 
    def cross_product(oax, oay, obx, oby, opx, opy):
        return (obx - oax) * (opy - oay) - (oby - oay) * (opx - oax)

    cp1 = cross_product(x1, y1, x2, y2, centerX, centerY)
    cp2 = cross_product(x2, y2, x3, y3, centerX, centerY)
    cp3 = cross_product(x3, y3, x4, y4, centerX, centerY)
    cp4 = cross_product(x4, y4, x1, y1, centerX, centerY)

    if (cp1 >= 0 and cp2 >= 0 and cp3 >= 0 and cp4 >= 0) or \
       (cp1 <= 0 and cp2 <= 0 and cp3 <= 0 and cp4 <= 0):
        return True
    return False

def latex(data, plugin_options, svg_paths):
    logging.info("Generating latex file")

    if len(data) == 0:
        return;

    free_paths = []
    nonfree_paths = []

    print(data)
    print(svg_paths)

    for path in svg_paths['svgPaths']:
        print("we got a path")
        pathBound = path['bounds']
        height = pathBound['height']
        width = pathBound['width']
        minX = pathBound['x'] + 500
        minY = pathBound['y'] + 500

        centerX = minX + width / 2.0
        centerY = minY + height / 2.0
        found_in_quadbox = False
        for bound in data['quad_boxes']:
            print("we got a bound")
            x1, y1, x2, y2, x3, y3, x4, y4 = bound
            contains = check_point(centerX, centerY, x1, y1, x2, y2, x3, y3, x4, y4)
            if(contains):
                found_in_quadbox = True;
                break;
        if not found_in_quadbox:
            free_paths.append(path)
        else:
            nonfree_paths.append(path)
    pdfData = data['labels'];

    svg_string = create_svg_string(free_paths, svg_paths['viewbox'])
    script_dir = os.path.dirname(os.path.abspath(__file__))
    tmp_dir_path = os.path.join(script_dir, "tmp")
    svg_file_path = os.path.join(tmp_dir_path, 'generated_image.svg')
    if(svg_string):
        with open(svg_file_path, "w") as f:
            f.write(svg_string)

        pdfData.append(r'''
        \begin{figure}[h!]
            \centering
            \includesvg[width=0.7\textwidth]{generated_image}
            \caption{Figure caption}
            \label{fig:my_svg}
        \end{figure}
        ''')

    text = "\n".join(data['labels'])


    # Remove </s> from response
    rendered = mistletoe.markdown(text.replace("</s>", ""), LaTeXRenderer)


    # Remove the article start document and end document lines since unneeded
    lines = rendered.splitlines()

    # filter out usepackages (user should import necessary packages in their template)
    lines = [line for line in lines if "usepackage" not in line and 'lstlisting' not in line];
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
