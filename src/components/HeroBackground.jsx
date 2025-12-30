"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Animated Hero Backgrounds
 * Spider-Man for Light Theme, Iron Man for Dark Theme
 */
export function HeroBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Base background color */}
      <div 
        className="absolute inset-0" 
        style={{ 
          background: isDark 
            ? 'hsl(8 45% 6%)' // Iron Man dark background
            : 'hsl(0 0% 96%)' // Spider-Man light background
        }} 
      />
      
      {/* Background Patterns */}
      {/* Light mode: Web pattern */}
      {!isDark && (
        <div className="absolute inset-0">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="webPattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#E62429" strokeWidth="0.5" opacity="0.12" />
                <circle cx="60" cy="60" r="35" fill="none" stroke="#E62429" strokeWidth="0.4" opacity="0.1" />
                <circle cx="60" cy="60" r="20" fill="none" stroke="#E62429" strokeWidth="0.3" opacity="0.08" />
                <line x1="60" y1="10" x2="60" y2="110" stroke="#E62429" strokeWidth="0.3" opacity="0.1" />
                <line x1="10" y1="60" x2="110" y2="60" stroke="#E62429" strokeWidth="0.3" opacity="0.1" />
                <line x1="20" y1="20" x2="100" y2="100" stroke="#E62429" strokeWidth="0.25" opacity="0.08" />
                <line x1="100" y1="20" x2="20" y2="100" stroke="#E62429" strokeWidth="0.25" opacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#webPattern)" />
          </svg>
        </div>
      )}

      {/* Dark mode: Hex tech pattern */}
      {isDark && (
        <div className="absolute inset-0">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexPattern" x="0" y="0" width="56" height="100" patternUnits="userSpaceOnUse">
                <path 
                  d="M28 0L56 14v28L28 56 0 42V14L28 0zm0 56L56 70v28L28 100 0 84V56l28-14z" 
                  fill="none" 
                  stroke="#B8860B" 
                  strokeWidth="0.5" 
                  opacity="0.15" 
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexPattern)" />
          </svg>
        </div>
      )}

      {/* Spider-Man Character - Light Theme */}
      {!isDark && (
        <div className="absolute bottom-0 left-1/2">
          <svg 
            viewBox="0 0 300 500" 
            className="w-[60vw] h-[75vh] max-w-[400px] max-h-[650px]"
            style={{ 
              transform: "translateX(-50%) translateY(8%)",
              animation: "spiderSwing 6s ease-in-out infinite" 
            }}
          >
            <defs>
              <linearGradient id="spiderSuit" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E62429" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#8B0000" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1A1A2E" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="spiderAccent" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF4D6D" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#E62429" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            
            {/* Spider-Man Body - Dynamic Pose */}
            <g fill="url(#spiderSuit)">
              {/* Head */}
              <ellipse cx="150" cy="60" rx="38" ry="45" />
              
              {/* Eyes - Large angular Spider-Man eyes */}
              <path d="M120 45 Q138 25 155 42 Q140 65 120 45" fill="white" fillOpacity="0.6" />
              <path d="M180 45 Q162 25 145 42 Q160 65 180 45" fill="white" fillOpacity="0.6" />
              
              {/* Torso */}
              <path d="M112 100 Q105 145 110 190 L118 235 Q150 255 182 235 L190 190 Q195 145 188 100 Q150 82 112 100" />
              
              {/* Spider Logo on chest */}
              <path 
                d="M150 125 L143 138 L128 132 L138 145 L123 160 L143 152 L150 168 L157 152 L177 160 L162 145 L172 132 L157 138 Z" 
                fill="#1A1A2E" 
                fillOpacity="0.25"
              />
              
              {/* Left Arm - Reaching up (web shooting pose) */}
              <path d="M112 105 Q75 70 50 25 Q43 18 38 25 Q32 38 45 52 Q70 90 100 120" fill="url(#spiderAccent)" />
              
              {/* Right Arm - Down/Back */}
              <path d="M188 105 Q215 140 240 195 Q248 210 238 218 Q225 212 218 190 Q200 150 178 118" fill="url(#spiderAccent)" />
              
              {/* Left Leg - Extended */}
              <path d="M118 230 Q95 300 70 380 Q62 420 75 428 Q88 422 95 385 Q115 310 132 245" />
              
              {/* Right Leg - Bent */}
              <path d="M175 230 Q198 280 235 320 Q260 350 275 400 Q282 420 270 428 Q258 420 245 390 Q215 330 185 270 Q178 250 168 238" />
            </g>
            
            {/* Web Lines shooting from hand */}
            <g stroke="#E62429" strokeWidth="1.5" fill="none" opacity="0.35">
              <path d="M42 30 Q15 10 0 0" strokeDasharray="4,4">
                <animate attributeName="stroke-dashoffset" from="0" to="8" dur="0.8s" repeatCount="indefinite" />
              </path>
              <path d="M42 30 Q10 25 -10 30" strokeDasharray="4,4">
                <animate attributeName="stroke-dashoffset" from="0" to="8" dur="1s" repeatCount="indefinite" />
              </path>
              <path d="M42 30 Q20 55 5 80" strokeDasharray="4,4">
                <animate attributeName="stroke-dashoffset" from="0" to="8" dur="0.6s" repeatCount="indefinite" />
              </path>
            </g>
            
            {/* Web pattern on suit */}
            <g stroke="#1A1A2E" strokeWidth="0.8" fill="none" opacity="0.15">
              <ellipse cx="150" cy="60" rx="32" ry="38" />
              <line x1="150" y1="22" x2="150" y2="98" />
              <line x1="118" y1="60" x2="182" y2="60" />
              <path d="M150 105 L150 220" />
              <path d="M118 130 Q150 115 182 130" />
              <path d="M112 165 Q150 145 188 165" />
              <path d="M115 200 Q150 175 185 200" />
            </g>
          </svg>
        </div>
      )}

      {/* Iron Man Character - Dark Theme */}
      {isDark && (
        <div className="absolute bottom-0 left-1/2">
          <svg 
            viewBox="0 0 300 500" 
            className="w-[60vw] h-[78vh] max-w-[420px] max-h-[680px]"
            style={{ 
              transform: "translateX(-50%) translateY(5%)",
              animation: "ironFloat 5s ease-in-out infinite" 
            }}
          >
            <defs>
              <linearGradient id="ironArmor" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#CC9A0B" stopOpacity="0.45" />
                <stop offset="30%" stopColor="#8B0000" stopOpacity="0.4" />
                <stop offset="70%" stopColor="#8B0000" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#CC9A0B" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="ironGold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#B8860B" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#FFD700" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#B8860B" stopOpacity="0.5" />
              </linearGradient>
              <radialGradient id="arcReactor" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="40%" stopColor="#00D4FF" stopOpacity="0.6">
                  <animate attributeName="stop-opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="strongGlow">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Iron Man Armor */}
            <g fill="url(#ironArmor)">
              {/* Helmet */}
              <path d="M150 15 Q95 22 82 75 L75 110 Q82 135 108 142 L108 95 Q120 55 150 48 Q180 55 192 95 L192 142 Q218 135 225 110 L218 75 Q205 22 150 15" />
              
              {/* Face Plate */}
              <path d="M108 72 Q130 48 150 48 Q170 48 192 72 L192 108 Q170 120 150 120 Q130 120 108 108 Z" fill="url(#ironGold)" />
              
              {/* Eye Slits - Glowing */}
              <path d="M118 78 L142 72 L142 92 L118 98 Z" fill="#00D4FF" fillOpacity="0.8" filter="url(#strongGlow)" />
              <path d="M182 78 L158 72 L158 92 L182 98 Z" fill="#00D4FF" fillOpacity="0.8" filter="url(#strongGlow)" />
              
              {/* Torso/Chest */}
              <path d="M95 140 Q82 180 88 225 L95 290 Q150 315 205 290 L212 225 Q218 180 205 140 Q150 122 95 140" />
              
              {/* Arc Reactor - Central and prominent */}
              <circle cx="150" cy="190" r="30" fill="url(#arcReactor)" filter="url(#strongGlow)" />
              <circle cx="150" cy="190" r="22" fill="none" stroke="#00D4FF" strokeWidth="2.5" opacity="0.7" />
              <circle cx="150" cy="190" r="14" fill="#00D4FF" fillOpacity="0.6" />
              <circle cx="150" cy="190" r="7" fill="#FFFFFF" fillOpacity="0.9">
                <animate attributeName="r" values="7;9;7" dur="1s" repeatCount="indefinite" />
              </circle>
              
              {/* Chest Plates Lines */}
              <path d="M105 155 L145 185" stroke="#B8860B" strokeWidth="2" opacity="0.4" />
              <path d="M195 155 L155 185" stroke="#B8860B" strokeWidth="2" opacity="0.4" />
              <path d="M98 225 L145 195" stroke="#B8860B" strokeWidth="1.5" opacity="0.35" />
              <path d="M202 225 L155 195" stroke="#B8860B" strokeWidth="1.5" opacity="0.35" />
              
              {/* Left Arm - Repulsor pose */}
              <path d="M95 145 Q60 158 38 185 Q20 210 12 260 Q5 285 18 298 Q32 292 38 268 Q52 215 82 180 Q95 168 92 158" fill="url(#ironGold)" />
              {/* Left Repulsor - Glowing */}
              <circle cx="18" cy="292" r="12" fill="url(#arcReactor)" filter="url(#strongGlow)" />
              
              {/* Right Arm */}
              <path d="M205 145 Q240 168 268 215 Q282 252 275 290 Q282 315 268 322 Q255 315 262 285 Q258 242 232 198 Q212 168 212 155" fill="url(#ironGold)" />
              {/* Right Repulsor */}
              <circle cx="268" cy="318" r="10" fill="url(#arcReactor)" filter="url(#glow)" opacity="0.7" />
              
              {/* Left Leg */}
              <path d="M110 285 Q92 360 80 430 Q72 480 88 495 Q102 488 108 475 Q115 440 122 400 Q135 340 140 295" />
              {/* Left Boot Thruster */}
              <ellipse cx="88" cy="492" rx="14" ry="7" fill="url(#arcReactor)" filter="url(#glow)" opacity="0.6" />
              
              {/* Right Leg */}
              <path d="M190 285 Q202 340 210 410 Q218 455 232 485 Q240 505 225 512 Q210 505 202 482 Q195 445 185 395 Q172 340 165 295" />
              {/* Right Boot Thruster */}
              <ellipse cx="225" cy="508" rx="14" ry="7" fill="url(#arcReactor)" filter="url(#glow)" opacity="0.6" />
            </g>
            
            {/* Armor Panel Lines */}
            <g stroke="#B8860B" strokeWidth="0.8" fill="none" opacity="0.25">
              <path d="M150 125 L150 290" />
              <path d="M115 160 L115 270" />
              <path d="M185 160 L185 270" />
              <path d="M95 200 L205 200" />
              <path d="M100 250 L200 250" />
            </g>
          </svg>
          
          {/* HUD Scan Line */}
          <div 
            className="fixed top-0 left-0 right-0 h-[3px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5), transparent)",
              animation: "hudScan 5s linear infinite",
            }}
          />
        </div>
      )}

      <style jsx global>{`
        @keyframes spiderSwing {
          0%, 100% { transform: translateX(-50%) translateY(8%) rotate(-2deg); }
          50% { transform: translateX(-50%) translateY(3%) rotate(2deg); }
        }
        @keyframes ironFloat {
          0%, 100% { transform: translateX(-50%) translateY(5%); }
          50% { transform: translateX(-50%) translateY(-1%); }
        }
        @keyframes hudScan {
          0% { transform: translateY(-100%); opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default HeroBackground;

