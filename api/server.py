import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# This route handles GET requests to the root URL ("/")
@app.route('/')
def home():
    return "Hello, World!\n"

# This route handles GET requests to "/greet"
@app.route('/greet')
def greet():
    return "Welcome to my Flask app!\n"

@app.route('/weather', methods=['GET'])
def weather():
    try:
        # Make a GET request to the weather service
        response = requests.get('https://wttr.in/?format=3')

        if response.status_code == 200:
            weather_info = response.text.strip()

            # Print the weather info (this will display the decoded string in the terminal)
            print(weather_info)

            # Return the weather data in a JSON response
            return jsonify({"weather": weather_info}), 200
        else:
            # Return error if the weather service fails
            return jsonify({"error": "Unable to fetch weather data"}), response.status_code
    except Exception as e:
        # Handle any exception (e.g., network issues)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Function to fetch weather data (using wttr.in)
def get_weather():
    try:
        # Example: Using wttr.in to get a simple weather forecast for a location
        url = f"https://wttr.in/?format=3"  # Format the result as: weather condition + temperature
        response = requests.get(url)

        if response.status_code == 200:
            weather_data = response.text.strip()
            return weather_data
        else:
            return None
    except Exception as e:
        print(f"Error fetching weather: {str(e)}")
        return None

# Main route that processes the incoming JSON
@app.route('/process', methods=['POST'])
def process_request():
    try:
        # Get the incoming JSON request
        input_data = request.get_json()

        # Prepare output data with the same structure as input
        output_data = input_data.copy()

        # Check if 'weather' plugin is requested
        if input_data.get("weather", True):
            weather_info = get_weather()
            
            if weather_info:
                # If weather info is retrieved successfully, append it to the output data
                output_data["weather_info"] = {
                    "description": weather_info,  # Example: "Sunny"
                }
            else:
                # If weather info can't be fetched, return an error message
                output_data["weather_info"] = {
                    "error": "Unable to fetch weather data."
                }

        # Return the updated JSON response
        return jsonify(output_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Custom error handler for undefined URLs (404)
@app.errorhandler(404)
def page_not_found(e):
    return jsonify({
        "error": "Not Found",
        "message": "The URL you requested does not exist. Please check the URL or visit the available routes.",
        "available_routes": ["/", "/greet"]
    }), 404

if __name__ == '__main__':
    app.run(debug=True)


