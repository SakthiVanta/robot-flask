from flask import Flask, request, jsonify, render_template
import os
import datetime
import json

app = Flask(__name__)
UPLOAD_FOLDER = 'static/uploads/'
JSON_FILE_PATH = 'mapping_data.json'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load existing mapping data if available
if os.path.exists(JSON_FILE_PATH):
    with open(JSON_FILE_PATH, 'r') as file:
        try:
            mapping_data = json.load(file)
        except json.JSONDecodeError:
            mapping_data = []
else:
    mapping_data = []

selected_destination = None
robot_status = 'idle'

# Function to save mapping data to a JSON file
def save_to_json():
    with open(JSON_FILE_PATH, 'w') as file:
        json.dump(mapping_data, file, indent=4)

@app.route('/')
def index():
    print(jsonify(mapping_data)) 
    return render_template('index.html', mapping_data=jsonify(mapping_data))

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    distance = request.form.get('distance', 'Unknown')
    coordinates = request.form.get('coordinates', '{}')
    
    filename = datetime.datetime.now().strftime('%Y%m%d%H%M%S') + '.jpg'
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    
    try:
        coordinates = json.loads(coordinates)
    except json.JSONDecodeError:
        coordinates = {}
    
    mapping_data.append({'image': file_path, 'distance': distance, 'coordinates': coordinates})
    save_to_json()  # Save updated data to JSON file
    return jsonify({'message': 'Data received successfully'})

@app.route('/get_mapping', methods=['GET'])
def get_mapping():
    return jsonify({'mapping_data': mapping_data})

@app.route('/select_destination', methods=['POST'])
def select_destination():
    global selected_destination
    data = request.get_json()
    selected_destination = data.get('coordinates')
    return jsonify({'message': 'Destination set successfully'})

@app.route('/get_destination', methods=['GET'])
def get_destination():
    if selected_destination:
        return jsonify({'coordinates': selected_destination})
    return jsonify({'error': 'No destination set'}), 400

@app.route('/map_data', methods=['GET'])
def map_data():
    return jsonify(mapping_data)

@app.route('/move_robot', methods=['POST'])
def move_robot():
    global robot_status
    direction = request.json.get('direction')
    if direction:
        robot_status = 'moving'
        return jsonify({'message': f'Robot moving {direction}', 'status': robot_status})
    return jsonify({'error': 'Invalid direction'}), 400

@app.route('/get_robot_status', methods=['GET'])
def get_robot_status():
    return jsonify({'status': robot_status})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
