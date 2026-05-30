/**
 * Generates animated SVG stick figures for exercises
 * Returns HTML string with inline SVG and CSS animations
 */

export function generateStickFigureSVG(svgType) {
  const animations = {
    squat: `
      <svg viewBox="0 0 200 300" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes squat-anim { 0%, 100% { opacity: 1; } 33% { opacity: 0; } 34%, 66% { opacity: 1; } 67% { opacity: 0; } }
          .squat-start { animation: squat-anim 3s infinite; }
          .squat-mid { animation: squat-anim 3s infinite 1s; }
          .squat-end { animation: squat-anim 3s infinite 2s; }
        </style>
        <!-- Standing -->
        <g class="squat-start">
          <circle cx="100" cy="40" r="15" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="55" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="85" y1="60" x2="100" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="115" y1="60" x2="100" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="85" y2="150" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="115" y2="150" stroke="#333" stroke-width="2"/>
          <circle cx="85" cy="155" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="115" cy="155" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Squat Down -->
        <g class="squat-mid">
          <circle cx="100" cy="60" r="15" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="75" x2="100" y2="110" stroke="#333" stroke-width="2"/>
          <line x1="80" y1="80" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="120" y1="80" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="85" y1="110" x2="80" y2="140" stroke="#333" stroke-width="2"/>
          <line x1="115" y1="110" x2="120" y2="140" stroke="#333" stroke-width="2"/>
          <circle cx="80" cy="145" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="120" cy="145" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Standing End -->
        <g class="squat-end">
          <circle cx="100" cy="40" r="15" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="55" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="85" y1="60" x2="100" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="115" y1="60" x2="100" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="85" y2="150" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="115" y2="150" stroke="#333" stroke-width="2"/>
          <circle cx="85" cy="155" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="115" cy="155" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `,

    pushup: `
      <svg viewBox="0 0 200 200" width="200" height="150" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes pushup-anim { 0%, 100% { opacity: 1; } 33% { opacity: 0; } 34%, 66% { opacity: 1; } 67% { opacity: 0; } }
          .pushup-up { animation: pushup-anim 3s infinite; }
          .pushup-down { animation: pushup-anim 3s infinite 1s; }
          .pushup-up-end { animation: pushup-anim 3s infinite 2s; }
        </style>
        <!-- Up Position -->
        <g class="pushup-up">
          <circle cx="100" cy="30" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="42" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="50" y1="50" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="150" y1="50" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="40" y1="50" x2="60" y2="50" stroke="#333" stroke-width="2"/>
          <line x1="160" y1="50" x2="140" y2="50" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="70" x2="85" y2="120" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="70" x2="115" y2="120" stroke="#333" stroke-width="2"/>
        </g>
        <!-- Down Position -->
        <g class="pushup-down">
          <circle cx="100" cy="50" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="62" x2="100" y2="85" stroke="#333" stroke-width="2"/>
          <line x1="50" y1="70" x2="100" y2="85" stroke="#333" stroke-width="2"/>
          <line x1="150" y1="70" x2="100" y2="85" stroke="#333" stroke-width="2"/>
          <line x1="35" y1="70" x2="55" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="165" y1="70" x2="145" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="85" x2="85" y2="120" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="85" x2="115" y2="120" stroke="#333" stroke-width="2"/>
        </g>
        <!-- Up End -->
        <g class="pushup-up-end">
          <circle cx="100" cy="30" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="42" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="50" y1="50" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="150" y1="50" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="40" y1="50" x2="60" y2="50" stroke="#333" stroke-width="2"/>
          <line x1="160" y1="50" x2="140" y2="50" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="70" x2="85" y2="120" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="70" x2="115" y2="120" stroke="#333" stroke-width="2"/>
        </g>
      </svg>
    `,

    lunge: `
      <svg viewBox="0 0 200 300" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes lunge-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          .lunge-start { animation: lunge-anim 3s infinite; }
          .lunge-lunged { animation: lunge-anim 3s infinite 1.5s; }
        </style>
        <!-- Standing Start -->
        <g class="lunge-start">
          <circle cx="100" cy="40" r="15" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="55" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="85" y1="60" x2="100" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="115" y1="60" x2="100" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="85" y2="150" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="115" y2="150" stroke="#333" stroke-width="2"/>
          <circle cx="85" cy="155" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="115" cy="155" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Lunged -->
        <g class="lunge-lunged">
          <circle cx="95" cy="50" r="15" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="95" y1="65" x2="95" y2="110" stroke="#333" stroke-width="2"/>
          <line x1="75" y1="70" x2="95" y2="90" stroke="#333" stroke-width="2"/>
          <line x1="115" y1="70" x2="95" y2="90" stroke="#333" stroke-width="2"/>
          <line x1="70" y1="110" x2="60" y2="150" stroke="#333" stroke-width="2"/>
          <line x1="120" y1="110" x2="140" y2="150" stroke="#333" stroke-width="2"/>
          <circle cx="60" cy="155" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="140" cy="155" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `,

    deadlift: `
      <svg viewBox="0 0 200 300" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes deadlift-anim { 0%, 100% { opacity: 1; } 33% { opacity: 0; } 34%, 66% { opacity: 1; } 67% { opacity: 0; } }
          .deadlift-bent { animation: deadlift-anim 3s infinite; }
          .deadlift-mid { animation: deadlift-anim 3s infinite 1s; }
          .deadlift-straight { animation: deadlift-anim 3s infinite 2s; }
        </style>
        <!-- Bent Over -->
        <g class="deadlift-bent">
          <circle cx="80" cy="80" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="80" y1="92" x2="100" y2="160" stroke="#333" stroke-width="2"/>
          <line x1="65" y1="85" x2="80" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="95" y1="85" x2="80" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="70" y1="160" x2="60" y2="200" stroke="#333" stroke-width="2"/>
          <line x1="130" y1="160" x2="140" y2="200" stroke="#333" stroke-width="2"/>
          <circle cx="60" cy="205" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="140" cy="205" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Halfway Up -->
        <g class="deadlift-mid">
          <circle cx="90" cy="60" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="90" y1="72" x2="100" y2="130" stroke="#333" stroke-width="2"/>
          <line x1="75" y1="65" x2="90" y2="85" stroke="#333" stroke-width="2"/>
          <line x1="105" y1="65" x2="90" y2="85" stroke="#333" stroke-width="2"/>
          <line x1="80" y1="130" x2="70" y2="190" stroke="#333" stroke-width="2"/>
          <line x1="120" y1="130" x2="130" y2="190" stroke="#333" stroke-width="2"/>
          <circle cx="70" cy="195" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="130" cy="195" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Standing -->
        <g class="deadlift-straight">
          <circle cx="100" cy="40" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="52" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="85" y1="50" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="115" y1="50" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="85" y2="160" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="115" y2="160" stroke="#333" stroke-width="2"/>
          <circle cx="85" cy="165" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="115" cy="165" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `,

    pullup: `
      <svg viewBox="0 0 200 250" width="200" height="180" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes pullup-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          .pullup-hang { animation: pullup-anim 3s infinite; }
          .pullup-pulled { animation: pullup-anim 3s infinite 1.5s; }
        </style>
        <!-- Bar -->
        <line x1="40" y1="30" x2="160" y2="30" stroke="#555" stroke-width="3"/>
        <!-- Hanging -->
        <g class="pullup-hang">
          <circle cx="100" cy="70" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="82" x2="100" y2="130" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="40" x2="100" y2="70" stroke="#666" stroke-width="1.5" stroke-dasharray="2,2"/>
          <line x1="85" y1="85" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="115" y1="85" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="130" x2="80" y2="170" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="130" x2="120" y2="170" stroke="#333" stroke-width="2"/>
          <circle cx="80" cy="175" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="120" cy="175" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Pulled Up -->
        <g class="pullup-pulled">
          <circle cx="100" cy="45" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="57" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="70" y1="50" x2="100" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="130" y1="50" x2="100" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="80" y2="155" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="120" y2="155" stroke="#333" stroke-width="2"/>
          <circle cx="80" cy="160" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="120" cy="160" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `,

    plank: `
      <svg viewBox="0 0 200 150" width="200" height="120" xmlns="http://www.w3.org/2000/svg">
        <g>
          <circle cx="60" cy="40" r="10" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="60" y1="50" x2="70" y2="80" stroke="#333" stroke-width="2"/>
          <line x1="30" y1="55" x2="60" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="90" y1="55" x2="60" y2="75" stroke="#333" stroke-width="2"/>
          <line x1="20" y1="55" x2="40" y2="55" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="55" x2="80" y2="55" stroke="#333" stroke-width="2"/>
          <line x1="50" y1="80" x2="35" y2="110" stroke="#333" stroke-width="2"/>
          <line x1="70" y1="80" x2="85" y2="110" stroke="#333" stroke-width="2"/>
        </g>
        <text x="100" y="50" font-size="12" fill="#999">Hold position</text>
      </svg>
    `,

    situp: `
      <svg viewBox="0 0 200 200" width="200" height="180" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes situp-anim { 0%, 100% { opacity: 1; } 33% { opacity: 0; } 34%, 66% { opacity: 1; } 67% { opacity: 0; } }
          .situp-down { animation: situp-anim 3s infinite; }
          .situp-mid { animation: situp-anim 3s infinite 1s; }
          .situp-up { animation: situp-anim 3s infinite 2s; }
        </style>
        <!-- Lying Down -->
        <g class="situp-down">
          <circle cx="100" cy="130" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="118" x2="100" y2="70" stroke="#333" stroke-width="2"/>
          <line x1="85" y1="115" x2="100" y2="95" stroke="#333" stroke-width="2"/>
          <line x1="115" y1="115" x2="100" y2="95" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="70" x2="75" y2="40" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="70" x2="125" y2="40" stroke="#333" stroke-width="2"/>
          <circle cx="75" cy="35" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="125" cy="35" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Halfway -->
        <g class="situp-mid">
          <circle cx="100" cy="90" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="78" x2="100" y2="40" stroke="#333" stroke-width="2"/>
          <line x1="80" y1="80" x2="100" y2="65" stroke="#333" stroke-width="2"/>
          <line x1="120" y1="80" x2="100" y2="65" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="40" x2="85" y2="20" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="40" x2="115" y2="20" stroke="#333" stroke-width="2"/>
          <circle cx="85" cy="15" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="115" cy="15" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Sitting Up -->
        <g class="situp-up">
          <circle cx="100" cy="60" r="12" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="48" x2="100" y2="20" stroke="#333" stroke-width="2"/>
          <line x1="75" y1="50" x2="100" y2="40" stroke="#333" stroke-width="2"/>
          <line x1="125" y1="50" x2="100" y2="40" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="20" x2="90" y2="5" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="20" x2="110" y2="5" stroke="#333" stroke-width="2"/>
          <circle cx="90" cy="0" r="5" stroke="#333" stroke-width="2" fill="none"/>
          <circle cx="110" cy="0" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `,

    legcurl: `
      <svg viewBox="0 0 200 200" width="200" height="150" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes legcurl-anim { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          .curl-down { animation: legcurl-anim 3s infinite; }
          .curl-up { animation: legcurl-anim 3s infinite 1.5s; }
        </style>
        <!-- Extended -->
        <g class="curl-down">
          <circle cx="100" cy="40" r="10" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="50" x2="100" y2="90" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="90" x2="100" y2="130" stroke="#333" stroke-width="2"/>
          <circle cx="100" cy="135" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
        <!-- Curled -->
        <g class="curl-up">
          <circle cx="100" cy="40" r="10" stroke="#333" stroke-width="2" fill="none"/>
          <line x1="100" y1="50" x2="100" y2="100" stroke="#333" stroke-width="2"/>
          <line x1="100" y1="100" x2="130" y2="120" stroke="#333" stroke-width="2"/>
          <circle cx="135" cy="125" r="5" stroke="#333" stroke-width="2" fill="none"/>
        </g>
      </svg>
    `,

    // Default fallback for unknown types
    default: `
      <svg viewBox="0 0 200 300" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="40" r="15" stroke="#333" stroke-width="2" fill="none"/>
        <line x1="100" y1="55" x2="100" y2="130" stroke="#333" stroke-width="2"/>
        <line x1="70" y1="75" x2="130" y2="75" stroke="#333" stroke-width="2"/>
        <line x1="100" y1="130" x2="75" y2="200" stroke="#333" stroke-width="2"/>
        <line x1="100" y1="130" x2="125" y2="200" stroke="#333" stroke-width="2"/>
        <circle cx="75" cy="205" r="5" stroke="#333" stroke-width="2" fill="none"/>
        <circle cx="125" cy="205" r="5" stroke="#333" stroke-width="2" fill="none"/>
        <text x="20" y="250" font-size="12" fill="#999">Exercise animation</text>
      </svg>
    `,
  };

  const svgContent = animations[svgType] || animations.default;
  return svgContent;
}
