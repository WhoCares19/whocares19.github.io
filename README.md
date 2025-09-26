<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mining Room Planner</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="main-container">
        <div id="left-sidebar">
            <div class="sidebar-section">
                <h3>Total Power: <span id="total-power">0</span> Gh/s</h3>
            </div>
            <div class="sidebar-section">
                <div class="room-header" data-room-id="Room 1">
                    <h4>Room 1</h4>
                    <span class="fold-icon">▼</span>
                </div>
                <div class="room-buttons">
                    <!-- Placeholder for Room 1 specific actions/info if any -->
                </div>
            </div>
            <div class="sidebar-section">
                <div class="room-header" data-room-id="Room 2">
                    <h4>Room 2</h4>
                    <span class="fold-icon">▼</span>
                </div>
                <div class="room-buttons">
                    <!-- Placeholder for Room 2 specific actions/info if any -->
                </div>
            </div>
            <!-- Dynamic room sections will be added here -->
            <div class="sidebar-section">
                <button id="add-room-btn">Add New Room</button>
            </div>
            <div class="sidebar-section">
                <button id="show-miners-btn">Miners</button>
            </div>
            <div class="sidebar-section">
                <button id="show-racks-btn">Racks</button>
            </div>
            <div class="sidebar-section">
                <button id="save-setup-btn">Save Setup</button>
                <input type="file" id="load-setup-input" accept=".json" style="display: none;">
                <button id="load-setup-btn">Load Setup</button>
            </div>
        </div>

        <div id="room-display">
            <img id="room-background" src="" alt="Room Background">
            <div id="rack-placeholders-container">
                <!-- Rack placeholders will be loaded here dynamically -->
            </div>
        </div>

        <div id="inventory-container">
            <div id="inventory-controls">
                <label for="search-bar">Search:</label>
                <input type="text" id="search-bar" placeholder="Miner or Rack name">

                <label for="sort-dropdown">Sort by:</label>
                <select id="sort-dropdown">
                    <!-- Options will be dynamic based on inventory type -->
                </select>

                <label for="level-dropdown" id="level-dropdown-label" style="display: none;">Level:</label>
                <select id="level-dropdown" style="display: none;">
                    <option value="all">All Levels</option>
                    <option value="1">Level 1</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3</option>
                    <option value="4">Level 4</option>
                    <option value="5">Level 5</option>
                    <option value="6">Level 6</option>
                </select>
            </div>
            <div id="inventory-items">
                <!-- Inventory items (miners/racks) will be loaded here -->
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
