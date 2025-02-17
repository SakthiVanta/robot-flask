const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

let obstacles = [];
let robotPosition = { x: 50, y: 50 };
let destination = null;
let zoomLevel = 1;
let focusedObstacle = null; // To track the focused obstacle

// Function to fetch map data from Flask API and update the map
function updateMap() {
    fetch('/map_data')
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                // Update obstacles based on fetched data
                obstacles = data.map((point, index) => ({
                    id: index,
                    x: point.coordinates.x,
                    y: point.coordinates.y,
                    image: point.image,
                    distance: point.distance
                }));

                // Re-render the map with updated data
                updateCanvas();

                // Generate obstacle cards
                const obstacleCardsContainer = document.getElementById('obstacle-cards');
                obstacleCardsContainer.innerHTML = '';  // Clear previous cards

                obstacles.forEach(obstacle => {
                    const card = document.createElement('div');
                    card.className = 'obstacle-card';
                    card.setAttribute('data-id', obstacle.id);
                    card.innerHTML = `
                        <h4>Obstacle ${obstacle.id + 1}</h4>
                        <p>Coordinates: (${obstacle.x}, ${obstacle.y})</p>
                        <p>Distance: ${obstacle.distance} meters</p>
                        <img src="${obstacle.image}" alt="Obstacle Image" width="50" height="50">
                    `;
                    obstacleCardsContainer.appendChild(card);
                    card.addEventListener('click', () => {
                        console.log(`Obstacle Card ${obstacle.id + 1} clicked!`);
                        focusObstacle(obstacle.id); // Pass obstacle's ID to focus function
                    });
                });
            }
        })
        .catch(error => {
            console.error("Error fetching map data:", error);
        });
}

// Draw grid background
function drawGrid() {
    const gridSpacing = 20 * zoomLevel;
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.5;

    for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Function to calculate distance between two points (robot and obstacle)
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Function to calculate angle between two points (robot and obstacle)
function calculateAngle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

// Draw obstacles with their images and dotted lines to the robot
function drawObstacles() {
    obstacles.forEach(obstacle => {
        // Draw obstacle
        ctx.beginPath();
        ctx.arc(obstacle.x * zoomLevel, obstacle.y * zoomLevel, 10, 0, 2 * Math.PI);
        
        // Set color based on whether the obstacle is focused or not
        if (focusedObstacle && focusedObstacle.id === obstacle.id) {
            ctx.fillStyle = '#FFFF00';  // Focused obstacle (Yellow color)
        } else {
            ctx.fillStyle = '#FFB6C1';  // Pastel pink color for normal obstacles
        }
        
        ctx.fill();
        ctx.strokeStyle = '#FF69B4';
        ctx.stroke();

        // If the obstacle is focused, calculate distance and angle to the robot
        if (focusedObstacle && focusedObstacle.id === obstacle.id) {
            const distance = calculateDistance(robotPosition.x, robotPosition.y, obstacle.x * zoomLevel, obstacle.y * zoomLevel);
            const angle = calculateAngle(robotPosition.x, robotPosition.y, obstacle.x * zoomLevel, obstacle.y * zoomLevel);

            // Draw dotted line from robot to obstacle
            ctx.setLineDash([5, 5]);  // Set dotted line pattern
            ctx.beginPath();
            ctx.moveTo(robotPosition.x, robotPosition.y);
            ctx.lineTo(obstacle.x * zoomLevel, obstacle.y * zoomLevel);
            ctx.strokeStyle = '#0000FF';  // Blue color for dotted line
            ctx.stroke();
            ctx.setLineDash([]);  // Reset line dash for normal lines

            // Calculate dynamic offset based on angle and distance to avoid text overlap
            const offset = 20 + Math.max(0, 100 - distance);  // Minimum 20px offset, increases as obstacles get closer
            const textX = (robotPosition.x + obstacle.x * zoomLevel) / 2 + offset * Math.cos(angle + Math.PI / 2);
            const textY = (robotPosition.y + obstacle.y * zoomLevel) / 2 + offset * Math.sin(angle + Math.PI / 2);

            // Display distance text at calculated position
            ctx.fillStyle = '#000000';  // Black color for text
            ctx.font = '12px Arial';
            ctx.fillText(`${distance.toFixed(2)} cm`, textX, textY);  // Show distance in cm
        }
    });
}

// Draw the robot
function drawRobot() {
    ctx.beginPath();
    ctx.arc(robotPosition.x, robotPosition.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#1E90FF';  // Blue color
    ctx.fill();
    ctx.stroke();
}

// Update Canvas
function updateCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear canvas
    drawGrid();
    drawObstacles();
    drawRobot();
}

// Event listeners for robot movement via Flask API
document.getElementById('move-forward').addEventListener('click', () => {
    moveRobot('forward');
});

document.getElementById('move-backward').addEventListener('click', () => {
    moveRobot('backward');
});

document.getElementById('move-left').addEventListener('click', () => {
    moveRobot('left');
});

document.getElementById('move-right').addEventListener('click', () => {
    moveRobot('right');
});

// Function to call the Flask API to move the robot
function moveRobot(direction) {
    fetch(`/move_bot?dir=${direction}`)
        .then(response => response.text())
        .then(message => {
            console.log(message);  // Log server response (e.g., "Moving forward")
            // Update robot position based on direction
            switch (direction) {
                case 'forward':
                    robotPosition.y -= 10; // Move up
                    break;
                case 'backward':
                    robotPosition.y += 10; // Move down
                    break;
                case 'left':
                    robotPosition.x -= 10; // Move left
                    break;
                case 'right':
                    robotPosition.x += 10; // Move right
                    break;
                default:
                    break;
            }
            updateCanvas();
        })
        .catch(error => {
            console.error("Error moving robot:", error);
        });
}

// Select Destination
document.getElementById('select-destination').addEventListener('click', () => {
    canvas.addEventListener('click', selectDestination);
});

function selectDestination(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Set destination coordinates
    destination = { x: x / zoomLevel, y: y / zoomLevel };
    
    // Draw the destination on the canvas
    ctx.beginPath();
    ctx.arc(destination.x * zoomLevel, destination.y * zoomLevel, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#32CD32';  // Green color for destination
    ctx.fill();
    ctx.stroke();
    
    // Disable the select destination button
    document.getElementById('select-destination').disabled = true;
    document.getElementById('move-to-destination').style.display = 'block';  // Show Move to Destination button
}

// Move Robot to the Selected Destination
document.getElementById('move-to-destination').addEventListener('click', () => {
    if (destination) {
        const dx = destination.x * zoomLevel - robotPosition.x;
        const dy = destination.y * zoomLevel - robotPosition.y;
        
        // Simulate robot movement by incrementally updating the position
        const steps = 100;
        const stepX = dx / steps;
        const stepY = dy / steps;
        
        let currentStep = 0;
        
        const interval = setInterval(() => {
            robotPosition.x += stepX;
            robotPosition.y += stepY;
            updateCanvas();
            
            currentStep++;
            if (currentStep >= steps) {
                clearInterval(interval);
                document.getElementById('move-to-destination').style.display = 'none';  // Hide Move to Destination button
                document.getElementById('select-destination').disabled = false;  // Enable Select Destination button again
            }
        }, 10);  // Move every 10 milliseconds
    }
});

// Handle click to focus on obstacle
document.querySelectorAll('.obstacle-card').forEach(card => {
    card.addEventListener('click', (e) => {
        const cardId = parseInt(e.target.getAttribute('data-id'));
        focusObstacle(cardId);
    });
});

// Function to focus on the clicked obstacle
function focusObstacle(cardId) {
    focusedObstacle = obstacles[cardId];  // Set focused obstacle
    updateCanvas();  // Re-render canvas to show the focused obstacle

    // Update obstacle card to show focus
    document.querySelectorAll('.obstacle-card').forEach(card => {
        card.classList.remove('highlight');
    });
    const focusedCard = document.querySelector(`.obstacle-card[data-id="${cardId}"]`);
    focusedCard.classList.add('highlight');
}

// Initial canvas rendering
updateMap();  // Initially load the map data
