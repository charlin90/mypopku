
import type { GeneratedConcept } from '../types.js';

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
          <button id="sun-btn">Add Sunlight ☀️</button>
          <button id="water-btn">Add Water 💧</button>
          <button id="co2-btn">Add CO₂ ☁️</button>
          <button id="reset-btn">Reset 🔄</button>
        </div>
      </div>
    `,
    css: `
      .photo-container {
        width: 100%;
        height: 100%;
        background-color: #f0f9ff;
        position: relative;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Outfit', sans-serif;
        border-radius: 16px;
      }
      .sun {
        width: 100px;
        height: 100px;
        background: #facc15;
        border: 2px solid black;
        border-radius: 50%;
        position: absolute;
        top: 20px;
        left: 20px;
        opacity: 0.2;
        transition: opacity 1s, transform 1s;
      }
      .sun.active {
        opacity: 1;
        box-shadow: 4px 4px 0px 0px black;
        transform: scale(1.1);
      }
      .plant {
        position: absolute;
        bottom: 50px;
        z-index: 10;
      }
      .stem {
        width: 12px;
        height: 100px;
        background: #4ade80;
        border: 2px solid black;
        border-bottom: none;
        border-radius: 8px 8px 0 0;
      }
      .leaf {
        width: 50px;
        height: 50px;
        background: #86efac;
        border: 2px solid black;
        border-radius: 0 50% 0 50%;
        position: absolute;
        bottom: 80px;
        left: -20px;
        transform: rotate(-45deg);
        transform-origin: bottom right;
        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .plant.growing .leaf {
        transform: rotate(-45deg) scale(1.8);
      }
      .ground {
        width: 100%;
        height: 50px;
        background: #d1d5db;
        border-top: 2px solid black;
        position: absolute;
        bottom: 0;
      }
      .water-droplet, .co2-molecule, .oxygen-molecule, .sugar-molecule {
        position: absolute;
        opacity: 0;
        transition: all 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        font-weight: 900;
        font-size: 1.5rem;
        background: white;
        padding: 4px 8px;
        border: 2px solid black;
        border-radius: 8px;
        box-shadow: 2px 2px 0px black;
      }
      .water-droplet {
        top: 60%; left: 10%; color: #3b82f6; border-radius: 50%; width: 40px; height: 40px; display:flex; justify-content:center;align-items:center;
      }
      .water-droplet::after { content: '💧'; font-size: 1.2rem; }

      .co2-molecule { top: 50%; left: 20%; color: #6b7280; }
      .oxygen-molecule { top: 40%; left: 70%; color: #ef4444; }
      .sugar-molecule { bottom: 80px; left: 55%; color: #eab308; }

      .water-droplet.active { opacity: 1; transform: translate(150px, -80px); }
      .co2-molecule.active { opacity: 1; transform: translate(120px, -50px); }
      .oxygen-molecule.active { opacity: 1; transform: translateX(100px) rotate(15deg); }
      .sugar-molecule.active { opacity: 1; transform: scale(1.2) rotate(-10deg); }

      .controls {
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 20;
      }
      .controls button {
        background-color: white;
        color: black;
        border: 2px solid black;
        padding: 10px 15px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 3px 3px 0px 0px black;
        transition: all 0.2s;
      }
      .controls button:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0px 0px black; }
      .controls button:active { transform: translate(0, 0); box-shadow: 1px 1px 0px 0px black; }
      .controls button:disabled { background-color: #e5e7eb; color: #9ca3af; cursor: not-allowed; border-color: #9ca3af; box-shadow: none; transform: none;}
    `,
    js: `
      const panel = document.querySelector('#explanation-panel');
      const sunBtn = document.querySelector('#sun-btn');
      const waterBtn = document.querySelector('#water-btn');
      const co2Btn = document.querySelector('#co2-btn');
      const resetBtn = document.querySelector('#reset-btn');
      
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
          if (panel) panel.innerHTML = "<h2>🎉 Photosynthesis!</h2><p>Boom! Light + Water + CO₂ = <strong>Oxygen</strong> and <strong>Sugar</strong>. The plant just made its own food!</p>";
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
          if (panel) panel.innerHTML = "<p><strong>Sunlight!</strong> ☀️ The plant is soaking up energy.</p>";
          checkPhotosynthesis();
        });
      }

      if (waterBtn && water) {
        waterBtn.addEventListener('click', () => {
          hasWater = true;
          water.classList.add('active');
          waterBtn.disabled = true;
          if (panel) panel.innerHTML = "<p><strong>Slurp!</strong> 💧 Roots are drinking up water.</p>";
          checkPhotosynthesis();
        });
      }

      if (co2Btn && co2) {
        co2Btn.addEventListener('click', () => {
          hasCO2 = true;
          co2.classList.add('active');
          co2Btn.disabled = true;
          if (panel) panel.innerHTML = "<p><strong>Breathe in...</strong> ☁️ The plant takes CO₂ from the air.</p>";
          checkPhotosynthesis();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            hasSun = false; hasWater = false; hasCO2 = false;
            sunBtn.disabled = false; waterBtn.disabled = false; co2Btn.disabled = false;
            sun.classList.remove('active');
            water.classList.remove('active');
            co2.classList.remove('active');
            oxygen.classList.remove('active');
            sugar.classList.remove('active');
            plant.classList.remove('growing');
            if (panel) panel.innerHTML = "## Photosynthesis 🌿\n\nPlants eat light! Click the buttons to give the plant what it needs.";
        });
      }
    `,
    explanation: "## Photosynthesis 🌿\n\nPlants eat light! Click the buttons to give the plant what it needs to make food."
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
          <div>
            <label for="justify-content">justify-content</label>
            <select id="justify-content">
                <option value="flex-start">flex-start</option>
                <option value="flex-end">flex-end</option>
                <option value="center">center</option>
                <option value="space-between">space-between</option>
                <option value="space-around">space-around</option>
                <option value="space-evenly">space-evenly</option>
            </select>
          </div>
          <div>
            <label for="align-items">align-items</label>
            <select id="align-items">
                <option value="stretch">stretch</option>
                <option value="flex-start">flex-start</option>
                <option value="flex-end">flex-end</option>
                <option value="center">center</option>
                <option value="baseline">baseline</option>
            </select>
          </div>
          <button id="reset-btn">Reset</button>
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
        font-family: 'Outfit', sans-serif;
      }
      .flex-container {
        display: flex;
        width: 100%;
        max-width: 600px;
        height: 250px;
        background-color: #fff;
        border: 3px solid black;
        border-radius: 16px;
        margin-bottom: 2rem;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        box-shadow: 6px 6px 0px 0px #e5e7eb;
        padding: 10px;
      }
      .flex-item {
        background-color: #f472b6; /* pink-400 */
        color: black;
        font-size: 2rem;
        font-weight: 900;
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: 80px;
        min-height: 80px;
        margin: 5px;
        border: 2px solid black;
        border-radius: 12px;
        flex-grow: 0;
        box-shadow: 3px 3px 0px black;
      }
      .flex-item:nth-child(2) { background-color: #22d3ee; /* cyan-400 */ }
      .flex-item:nth-child(3) { background-color: #a3e635; /* lime-400 */ }
      
      .flex-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        align-items: flex-end;
        background-color: #fff;
        padding: 1.5rem;
        border-radius: 16px;
        border: 3px solid black;
        box-shadow: 6px 6px 0px black;
      }
      .flex-controls label {
        font-size: 0.9rem;
        font-weight: bold;
        display: block;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .flex-controls select {
        background-color: #fff;
        color: black;
        border: 2px solid black;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 2px 2px 0px #ccc;
      }
      .flex-controls button {
        background: #000;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
      }
    `,
    js: `
      const container = document.querySelector('#flex-container');
      const justifyContentSelect = document.querySelector('#justify-content');
      const alignItemsSelect = document.querySelector('#align-items');
      const panel = document.querySelector('#explanation-panel');
      const resetBtn = document.querySelector('#reset-btn');

      if (justifyContentSelect && container) {
        justifyContentSelect.addEventListener('change', (e) => {
          const value = e.target.value;
          container.style.justifyContent = value;
          if (panel) {
            panel.innerHTML = \`<h2>↔️ Justify Content</h2><p>You set it to <strong>\${value}</strong>. This moves the boxes horizontally (the main axis).</p>\`;
          }
        });
      }

      if (alignItemsSelect && container) {
        alignItemsSelect.addEventListener('change', (e) => {
          const value = e.target.value;
          container.style.alignItems = value;
          if (panel) {
            panel.innerHTML = \`<h2>↕️ Align Items</h2><p>You set it to <strong>\${value}</strong>. This moves the boxes vertically (the cross axis).</p>\`;
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            container.style.justifyContent = 'flex-start';
            container.style.alignItems = 'stretch';
            justifyContentSelect.value = 'flex-start';
            alignItemsSelect.value = 'stretch';
            if (panel) panel.innerHTML = "## CSS Flexbox 📦\n\nFlexbox is magic for layouts! Use the dropdowns below to tell the boxes where to go.";
        });
      }
    `,
    explanation: "## CSS Flexbox 📦\n\nFlexbox is magic for layouts! Use the dropdowns below to tell the boxes where to go."
  },
};
