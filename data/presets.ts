import type { GeneratedConcept } from '../types';

export const PRESET_CONCEPTS: Record<string, GeneratedConcept> = {
  "Photosynthesis": {
    html: `
      <div class="photo-container">
        <div class="sun"></div>
        <div class="plant">
          <div class="leaf"></div>
          <div class="stem"></div>
        </div>
        <div class="ground"></div>
        <div class="water-droplet"></div>
        <div class="co2-molecule">CO₂</div>
        <div class="oxygen-molecule">O₂</div>
        <div class="sugar-molecule">C₆H₁₂O₆</div>
        <div class="controls">
          <button id="sun-btn">Add Sunlight</button>
          <button id="water-btn">Add Water</button>
          <button id="co2-btn">Add CO₂</button>
        </div>
      </div>
    `,
    css: `
      .photo-container {
        width: 100%;
        height: 100%;
        background-color: #1a202c;
        position: relative;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: sans-serif;
      }
      .sun {
        width: 100px;
        height: 100px;
        background: #f6e05e;
        border-radius: 50%;
        position: absolute;
        top: 20px;
        left: 20px;
        opacity: 0;
        transition: opacity 1s, box-shadow 1s;
      }
      .sun.active {
        opacity: 1;
        box-shadow: 0 0 50px #f6e05e;
      }
      .plant {
        position: absolute;
        bottom: 50px;
      }
      .stem {
        width: 10px;
        height: 100px;
        background: #48bb78;
        border-radius: 5px 5px 0 0;
      }
      .leaf {
        width: 50px;
        height: 50px;
        background: #68d391;
        border-radius: 0 50% 0 50%;
        position: absolute;
        bottom: 90px;
        left: -20px;
        transform: rotate(-45deg);
        transform-origin: bottom right;
        transition: transform 0.5s;
      }
      .plant.growing .leaf {
        transform: rotate(-45deg) scale(1.5);
      }
      .ground {
        width: 100%;
        height: 50px;
        background: #4a5568;
        position: absolute;
        bottom: 0;
      }
      .water-droplet, .co2-molecule, .oxygen-molecule, .sugar-molecule {
        position: absolute;
        opacity: 0;
        transition: all 2s;
        color: white;
        font-weight: bold;
        font-size: 1.5rem;
      }
      .water-droplet {
        top: 60%; left: 10%; background-color: #63b3ed; width: 20px; height: 20px; border-radius: 50%;
      }
      .co2-molecule { top: 50%; left: 20%; }
      .oxygen-molecule { top: 40%; left: 70%; }
      .sugar-molecule { bottom: 60px; left: 55%; }

      .water-droplet.active { opacity: 1; transform: translate(150px, -80px); }
      .co2-molecule.active { opacity: 1; transform: translate(120px, -50px); }
      .oxygen-molecule.active { opacity: 1; transform: translateX(100px); }
      .sugar-molecule.active { opacity: 1; transform: scale(1.2); }

      .controls {
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .controls button {
        background-color: #2d3748;
        color: white;
        border: 1px solid #4a5568;
        padding: 10px 15px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      .controls button:hover { background-color: #4a5568; }
      .controls button:disabled { background-color: #1a202c; color: #718096; cursor: not-allowed;}
    `,
    js: `
      const panel = document.querySelector('#explanation-panel');
      const sunBtn = document.querySelector('#sun-btn');
      const waterBtn = document.querySelector('#water-btn');
      const co2Btn = document.querySelector('#co2-btn');
      
      const sun = document.querySelector('.sun');
      const water = document.querySelector('.water-droplet');
      const co2 = document.querySelector('.co2-molecule');
      const oxygen = document.querySelector('.oxygen-molecule');
      const sugar = document.querySelector('.sugar-molecule');
      const plant = document.querySelector('.plant');

      let hasSun = false;
      let hasWater = false;
      let hasCO2 = false;

      function checkPhotosynthesis() {
        if (hasSun && hasWater && hasCO2) {
          if (panel) panel.innerHTML = "<h2>Photosynthesis!</h2><p>With sunlight, water, and CO₂, the plant has produced oxygen (O₂) and glucose (C₆H₁₂O₆) for energy. This is the essence of photosynthesis.</p>";
          if (oxygen) oxygen.classList.add('active');
          if (sugar) sugar.classList.add('active');
          if (plant) plant.classList.add('growing');
        }
      }
      
      if (sunBtn && sun) {
        sunBtn.addEventListener('click', () => {
          hasSun = true;
          sun.classList.add('active');
          sunBtn.disabled = true;
          if (panel) panel.innerHTML = "<p><strong>Sunlight added.</strong> The plant now has a source of energy.</p>";
          checkPhotosynthesis();
        });
      }

      if (waterBtn && water) {
        waterBtn.addEventListener('click', () => {
          hasWater = true;
          water.classList.add('active');
          waterBtn.disabled = true;
          if (panel) panel.innerHTML = "<p><strong>Water added.</strong> It travels from the roots to the leaves.</p>";
          checkPhotosynthesis();
        });
      }

      if (co2Btn && co2) {
        co2Btn.addEventListener('click', () => {
          hasCO2 = true;
          co2.classList.add('active');
          co2Btn.disabled = true;
          if (panel) panel.innerHTML = "<p><strong>Carbon Dioxide (CO₂) added.</strong> The plant takes this in from the air.</p>";
          checkPhotosynthesis();
        });
      }
    `,
    explanation: "## Photosynthesis\n\nThis is the process plants use to convert light energy into chemical energy. Start by providing the necessary elements for the plant to grow."
  },
  "CSS Flexbox": {
    html: `
      <div class="flex-container-wrapper">
        <div id="flex-container" class="flex-container">
          <div class="flex-item">1</div>
          <div class="flex-item">2</div>
          <div class="flex-item">3</div>
        </div>
        <div class="flex-controls">
          <label for="justify-content">justify-content:</label>
          <select id="justify-content">
            <option value="flex-start">flex-start</option>
            <option value="flex-end">flex-end</option>
            <option value="center">center</option>
            <option value="space-between">space-between</option>
            <option value="space-around">space-around</option>
            <option value="space-evenly">space-evenly</option>
          </select>
          <label for="align-items">align-items:</label>
          <select id="align-items">
            <option value="stretch">stretch</option>
            <option value="flex-start">flex-start</option>
            <option value="flex-end">flex-end</option>
            <option value="center">center</option>
            <option value="baseline">baseline</option>
          </select>
        </div>
      </div>
    `,
    css: `
      .flex-container-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        padding: 2rem;
        box-sizing: border-box;
      }
      .flex-container {
        display: flex;
        width: 100%;
        max-width: 600px;
        height: 200px;
        background-color: #2d3748;
        border: 2px solid #4a5568;
        border-radius: 8px;
        margin-bottom: 2rem;
        transition: all 0.3s ease-in-out;
      }
      .flex-item {
        background-color: #4299e1;
        color: white;
        font-size: 2rem;
        font-weight: bold;
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: 80px;
        margin: 10px;
        border-radius: 4px;
        flex-grow: 0;
      }
      .flex-controls {
        display: flex;
        gap: 20px;
        align-items: center;
        background-color: #1a202c;
        padding: 1rem;
        border-radius: 8px;
      }
      .flex-controls label {
        font-size: 1rem;
        color: #a0aec0;
      }
      .flex-controls select {
        background-color: #2d3748;
        color: white;
        border: 1px solid #4a5568;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 1rem;
      }
    `,
    js: `
      const container = document.querySelector('#flex-container');
      const justifyContentSelect = document.querySelector('#justify-content');
      const alignItemsSelect = document.querySelector('#align-items');
      const panel = document.querySelector('#explanation-panel');

      if (justifyContentSelect && container) {
        justifyContentSelect.addEventListener('change', (e) => {
          const value = e.target.value;
          container.style.justifyContent = value;
          if (panel) {
            panel.innerHTML = \`<h2>justify-content: \${value}</h2><p>This property aligns the items along the main axis (horizontally, in this case). Try other values to see how they differ.</p>\`;
          }
        });
      }

      if (alignItemsSelect && container) {
        alignItemsSelect.addEventListener('change', (e) => {
          const value = e.target.value;
          container.style.alignItems = value;
          if (panel) {
            panel.innerHTML = \`<h2>align-items: \${value}</h2><p>This property aligns the items along the cross axis (vertically). 'stretch' makes them fill the container's height.</p>\`;
          }
        });
      }
    `,
    explanation: "## CSS Flexbox\n\nFlexbox is a layout model for arranging items in a single dimension (a row or a column). Use the controls to change the container's properties and see how the items react."
  },
  "Black Holes": {
    html: `
      <div class="gravity-well">
        <div id="black-hole" class="black-hole"></div>
        <div id="star" class="star"></div>
        <div class="controls-bh">
          <label for="mass-slider">Black Hole Mass</label>
          <input type="range" id="mass-slider" min="50" max="200" value="100">
        </div>
      </div>
    `,
    css: `
      .gravity-well {
        width: 100%;
        height: 100%;
        background-color: #000;
        background-image: radial-gradient(white 0.5px, transparent 0);
        background-size: 20px 20px;
        position: relative;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .black-hole {
        width: 100px;
        height: 100px;
        background-color: black;
        border-radius: 50%;
        position: absolute;
        border: 2px solid #4a5568;
        box-shadow: 0 0 0 5px black, 0 0 10px 5px #4c1d95;
        transition: width 0.5s, height 0.5s, box-shadow 0.5s;
      }
      .star {
        width: 30px;
        height: 30px;
        background-color: #f6e05e;
        border-radius: 50%;
        position: absolute;
        left: 50px;
        top: 50%;
        box-shadow: 0 0 20px #f6e05e;
        animation: orbit 10s linear infinite;
      }
      @keyframes orbit {
        from { transform: rotate(0deg) translateX(250px) rotate(0deg); }
        to   { transform: rotate(360deg) translateX(250px) rotate(-360deg); }
      }
      .controls-bh {
        position: absolute;
        bottom: 30px;
        background: rgba(20,20,20,0.7);
        padding: 1rem;
        border-radius: 8px;
        color: white;
      }
    `,
    js: `
      const blackHole = document.querySelector('#black-hole');
      const massSlider = document.querySelector('#mass-slider');
      const panel = document.querySelector('#explanation-panel');
      const star = document.querySelector('#star');

      if (massSlider && blackHole && star) {
        massSlider.addEventListener('input', (e) => {
          const mass = e.target.value;
          const newSize = mass;
          const animationDuration = 15 - (mass / 20);

          blackHole.style.width = \`\${newSize}px\`;
          blackHole.style.height = \`\${newSize}px\`;
          blackHole.style.boxShadow = \`0 0 0 5px black, 0 0 \${10 + mass / 10}px 5px #4c1d95\`;
          
          // This is a robust way to restart a CSS animation.
          // It avoids the race-condition bug caused by cloning and replacing the node.
          star.style.animation = 'none';
          void star.offsetWidth; // Trigger a DOM reflow
          star.style.animation = \`orbit \${animationDuration}s linear infinite\`;

          if (panel) {
            if (mass > 150) {
              panel.innerHTML = \`<h2>High Mass!</h2><p>The black hole's immense gravity warps spacetime significantly, pulling the star into a tighter, faster orbit. The 'event horizon' (the black circle) is now much larger.</p>\`;
            } else {
              panel.innerHTML = \`<h2>Mass Changed</h2><p>As you increase the black hole's mass, its gravitational pull intensifies. Notice how the star's orbit is affected.</p>\`;
            }
          }
        });
      }
    `,
    explanation: "## Black Holes\n\nA black hole is a region of spacetime where gravity is so strong that nothing—no particles or even electromagnetic radiation such as light—can escape from it. Adjust the black hole's mass to see how its gravity affects a nearby star."
  }
};