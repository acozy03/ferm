"use client"

import React from "react"

import Link from "next/link"
import { useEffect, useState, useRef, type ReactNode } from "react"
import { Heart } from "lucide-react";
import {
  ArrowUpRight,
  Linkedin,
  Play,
  Sparkles,
  Twitter,
  Youtube,
  Zap,
  Target,
  TrendingUp,
  MessageSquare,
  Mail,
  Star,
  Clock,
  ChevronRight,
  Brain,
} from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"

// Scroll-triggered animation wrapper
function ScrollReveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Decorative leaf/fern SVG shapes for the border frame
function LeafBorderFrame() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* =========================================
          LEFT SIDE 
          ========================================= */}

      {/* 1. TOP LEFT: Spider Plant Cluster (Grassy/Fern-like) */}
      <svg className="absolute -top-8 -left-8 w-64 h-64 opacity-40" viewBox="0 0 200 200" style={{ animation: 'gentleSway 7s ease-in-out infinite' }}>
        <path d="M20 20 Q60 80 80 150 Q90 180 85 190 Q70 160 50 100 Q30 50 20 20 Z" fill="rgb(63, 63, 70)" />
        <path d="M20 20 Q60 80 85 190" stroke="rgb(39, 39, 42)" strokeWidth="0.5" fill="none" />
        <path d="M10 30 Q50 90 40 160 Q35 180 30 170 Q45 100 10 30 Z" fill="rgb(52, 52, 59)" />
        <path d="M30 10 Q80 40 120 80 Q140 100 130 110 Q100 80 50 40 Q30 10 30 10 Z" fill="rgb(63, 63, 70)" />
      </svg>

      {/* 2. UPPER LEFT: Trailing Vine (Kept for verticality) */}
      <svg className="absolute top-[15%] -left-6 w-32 h-96 opacity-30" viewBox="0 0 100 400" style={{ animation: 'gentleSway 9s ease-in-out 1s infinite' }}>
        <path d="M20 0 Q40 100 20 200 Q0 300 30 400" stroke="rgb(82, 82, 91)" strokeWidth="1.5" fill="none" />
        <path d="M25 50 Q50 40 60 60 Q50 80 25 70 Z" fill="rgb(63, 63, 70)" />
        <path d="M15 120 Q-10 110 -20 130 Q-10 150 15 140 Z" fill="rgb(52, 52, 59)" transform="translate(10,0)" />
        <path d="M20 220 Q50 210 60 230 Q50 250 20 240 Z" fill="rgb(63, 63, 70)" />
      </svg>

      {/* 3. MID LEFT: REPLACEMENT - "Boston Fern" Explosion 
          Replaces the Elephant Ear with multiple thin fronds fanning out. */}
      <svg className="absolute top-[40%] -left-12 w-64 h-64 opacity-30" viewBox="0 0 200 200" style={{ animation: 'gentleSway 8s ease-in-out 2s infinite' }}>
        {/* Frond 1 (Up) */}
        <path d="M0 100 Q40 50 90 30" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        {[...Array(6)].map((_, i) => (
           <path key={`f1-${i}`} d={`M${15 + i*10} ${85 - i*8} L${25 + i*10} ${75 - i*10}`} stroke="rgb(63, 63, 70)" strokeWidth="2" strokeLinecap="round" />
        ))}
        
        {/* Frond 2 (Middle) */}
        <path d="M0 100 Q60 100 130 90" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        {[...Array(8)].map((_, i) => (
           <path key={`f2-${i}`} d={`M${20 + i*12} ${100 - i*1} L${20 + i*12} ${85 - i*1}`} stroke="rgb(63, 63, 70)" strokeWidth="2" strokeLinecap="round" />
        ))}

        {/* Frond 3 (Down) */}
        <path d="M0 100 Q50 140 110 170" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        {[...Array(6)].map((_, i) => (
           <path key={`f3-${i}`} d={`M${20 + i*12} ${115 + i*8} L${25 + i*12} ${130 + i*8}`} stroke="rgb(52, 52, 59)" strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>

      {/* 4. LOWER LEFT: Rising Sword Ferns */}
      <svg className="absolute top-[70%] -left-4 w-32 h-64 opacity-30" viewBox="0 0 100 200" style={{ animation: 'gentleSway 10s ease-in-out 0.5s infinite' }}>
        {[...Array(5)].map((_, i) => (
          <path key={i} 
                d={`M10 200 Q${20 + i*10} ${150 - i*20} ${80} ${100 - i*15}`} 
                stroke="rgb(63, 63, 70)" 
                strokeWidth={3 - i*0.4} 
                strokeLinecap="round" 
                fill="none" 
          />
        ))}
      </svg>

      {/* 5. BOTTOM LEFT CORNER: Dense Bush */}
      <svg className="absolute -bottom-8 -left-8 w-64 h-64 opacity-45" viewBox="0 0 250 250" style={{ animation: 'gentleSway 5s ease-in-out 0.2s infinite' }}>
        <path d="M30 30 Q60 80 80 130 Q100 180 70 230 Q90 170 75 110 Q60 60 30 30 Z" fill="rgb(63, 63, 70)" />
        <path d="M0 100 Q40 120 80 110 Q120 100 140 130 Q100 110 60 115 Z" fill="rgb(52, 52, 59)" opacity="0.8" />
        <path d="M50 200 Q90 190 120 220 Q80 230 40 240 Z" fill="rgb(63, 63, 70)" />
      </svg>


      {/* =========================================
          RIGHT SIDE (More Ferns, More Volume)
          ========================================= */}

      {/* 1A. NEW: TOP RIGHT BACKGROUND CLUSTER 
          Adds volume behind the ivy. Darker, denser fern fronds. */}
      <svg className="absolute -top-4 -right-4 w-64 h-64 opacity-20" viewBox="0 0 200 200" style={{ animation: 'gentleSway 8s ease-in-out 2s infinite' }}>
         <path d="M200 0 Q150 50 100 80" stroke="rgb(52, 52, 59)" strokeWidth="2" fill="none" />
         <path d="M200 0 Q180 80 160 140" stroke="rgb(52, 52, 59)" strokeWidth="2" fill="none" />
         <path d="M200 0 Q120 20 80 40" stroke="rgb(52, 52, 59)" strokeWidth="2" fill="none" />
         {/* Abstract leaf texture on these lines */}
         <path d="M120 40 L110 60 M130 30 L120 50 M140 20 L130 40" stroke="rgb(52, 52, 59)" strokeWidth="1" />
         <path d="M160 100 L140 110 M170 70 L150 80" stroke="rgb(52, 52, 59)" strokeWidth="1" />
      </svg>

      {/* 1B. TOP RIGHT: Dense Hanging Ivy 
          Slightly adjusted to overlap the background fern. */}
      <svg className="absolute -top-10 right-[5%] w-32 h-80 opacity-30" viewBox="0 0 100 300" style={{ animation: 'gentleSway 9s ease-in-out infinite' }}>
        <path d="M50 0 Q60 100 40 200 Q20 250 40 300" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M55 40 Q80 50 90 70 Q60 80 55 40 Z" fill="rgb(63, 63, 70)" />
        <path d="M55 40 Q75 60 90 70" stroke="rgb(39, 39, 42)" strokeWidth="0.5" fill="none" />
        <path d="M52 100 Q20 110 10 130 Q40 140 52 100 Z" fill="rgb(52, 52, 59)" />
        <path d="M45 160 Q70 170 80 190 Q50 200 45 160 Z" fill="rgb(63, 63, 70)" />
        <path d="M35 240 Q10 250 5 270 Q30 280 35 240 Z" fill="rgb(63, 63, 70)" />
      </svg>

      {/* 2. UPPER RIGHT: Large Frond (Made more fern-like)
          Changed from smooth edges to a jagged/toothed path. */}
      <svg className="absolute top-[10%] -right-12 w-64 h-64 opacity-35" viewBox="0 0 200 200" style={{ animation: 'gentleSway 7s ease-in-out 1.5s infinite' }}>
        <path d="M200 50 Q150 50 100 100 Q50 150 80 180" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        {/* Jagged Leaves */}
        <path d="M180 60 L160 80 L140 70 L150 65 Z" fill="rgb(63, 63, 70)" />
        <path d="M160 80 L140 100 L120 90 L130 85 Z" fill="rgb(63, 63, 70)" />
        <path d="M140 100 L120 120 L100 110 L110 105 Z" fill="rgb(63, 63, 70)" />
        <path d="M120 120 L100 140 L80 130 L90 125 Z" fill="rgb(63, 63, 70)" />
      </svg>

      {/* 3. MID RIGHT: Horizontal Fern Branch 
          Replaced broad leaves with a compound fern structure. */}
      <svg className="absolute top-[40%] -right-10 w-64 h-48 opacity-30" viewBox="0 0 250 150" style={{ animation: 'gentleSway 8s ease-in-out 2.5s infinite' }}>
        <path d="M250 75 Q180 75 100 90 Q50 105 20 80" stroke="rgb(82, 82, 91)" strokeWidth="1.5" fill="none" />
        {/* Top small leaves */}
        <path d="M180 75 L170 55 M150 78 L140 58 M120 82 L110 60" stroke="rgb(63, 63, 70)" strokeWidth="3" strokeLinecap="round" />
        {/* Bottom small leaves */}
        <path d="M170 75 L180 95 M140 80 L150 100 M110 85 L120 105" stroke="rgb(63, 63, 70)" strokeWidth="3" strokeLinecap="round" />
        {/* End tuft */}
        <path d="M20 80 Q10 40 40 30 Q50 70 20 80 Z" fill="rgb(52, 52, 59)" />
      </svg>

      {/* 4. LOW RIGHT: Snake Plant (Kept as anchor) */}
      <svg className="absolute top-[65%] -right-4 w-32 h-64 opacity-25" viewBox="0 0 100 250" style={{ animation: 'gentleSway 10s ease-in-out 1s infinite' }}>
        <path d="M90 250 Q100 150 60 50 Q40 100 50 250 Z" fill="rgb(63, 63, 70)" />
        <path d="M70 250 Q75 150 60 50" stroke="rgb(39, 39, 42)" strokeWidth="1" fill="none" />
        <path d="M100 250 Q110 180 30 120 Q50 200 80 250 Z" fill="rgb(52, 52, 59)" opacity="0.8" />
      </svg>

     {/* 4. LOWER RIGHT: Tall "Reed" Grasses
          Matches Left #4 (Sword Ferns) in upward direction and sharpness. */}
      <svg className="absolute top-[68%] -right-6 w-48 h-80 opacity-25" viewBox="0 0 150 300" style={{ animation: 'gentleSway 11s ease-in-out 2s infinite' }}>
        {/* Reed 1 */}
        <path d="M140 300 Q120 150 50 20" stroke="rgb(63, 63, 70)" strokeWidth="2" fill="none" />
        {/* Reed 2 (Thicker) */}
        <path d="M120 300 Q100 200 80 80 Q90 150 120 300 Z" fill="rgb(52, 52, 59)" opacity="0.7" />
        {/* Reed 3 */}
        <path d="M150 300 Q130 180 100 50" stroke="rgb(82, 82, 91)" strokeWidth="1.5" fill="none" />
        {/* Reed 4 */}
        <path d="M100 300 Q80 220 20 120" stroke="rgb(63, 63, 70)" strokeWidth="1" fill="none" />
      </svg>
      {/* 2. UPPER RIGHT: Long Trailing Ivy
          Matches Left #2 (Trailing Vine) in verticality and length. */}
      <svg className="absolute top-[12%] right-[2%] w-24 h-96 opacity-30" viewBox="0 0 60 400" style={{ animation: 'gentleSway 10s ease-in-out 1.5s infinite' }}>
        {/* Vine Stem */}
        <path d="M30 0 Q50 100 20 200 Q0 300 40 400" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        {/* Alternating Leaves */}
        <ellipse cx="40" cy="50" rx="8" ry="12" fill="rgb(63, 63, 70)" transform="rotate(20 40 50)" />
        <ellipse cx="15" cy="120" rx="8" ry="12" fill="rgb(52, 52, 59)" transform="rotate(-20 15 120)" />
        <ellipse cx="25" cy="200" rx="9" ry="14" fill="rgb(63, 63, 70)" transform="rotate(10 25 200)" />
        <ellipse cx="35" cy="290" rx="6" ry="10" fill="rgb(52, 52, 59)" transform="rotate(-15 35 290)" />
      </svg>
      <svg className="absolute -top-10 -right-8 w-72 h-72 opacity-40" viewBox="0 0 200 200" style={{ animation: 'gentleSway 7s ease-in-out 0.5s infinite' }}>

        {/* Secondary dark frond */}
        <path d="M190 10 Q150 50 130 100 Q120 140 100 180" stroke="rgb(52, 52, 59)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />
        {/* Small branching frond */}
        <path d="M170 30 Q130 50 120 70 Q110 90 80 100" stroke="rgb(82, 82, 91)" strokeWidth="2" fill="none" />
      </svg>
{/* 3. MID RIGHT: Giant Fern Frond "Explosion"
          Matches Left #3 (Boston Fern) in volume and horizontal reach. */}
      <svg className="absolute top-[40%] -right-12 w-80 h-64 opacity-30" viewBox="0 0 300 200" style={{ animation: 'gentleSway 9s ease-in-out 0.2s infinite' }}>
        {/* Main Spine curving INWARD */}
        <path d="M300 100 Q200 100 100 150" stroke="rgb(82, 82, 91)" strokeWidth="1.5" fill="none" />
        
        {/* Complex Fern Leaflets (Top side of spine) */}
        {[...Array(9)].map((_, i) => (
           <path key={`t-${i}`} d={`M${280 - i*20} ${100 + i*2} L${260 - i*20} ${70 + i*5}`} stroke="rgb(63, 63, 70)" strokeWidth="2" strokeLinecap="round" />
        ))}
        {/* Complex Fern Leaflets (Bottom side of spine) */}
        {[...Array(9)].map((_, i) => (
           <path key={`b-${i}`} d={`M${280 - i*20} ${100 + i*2} L${270 - i*20} ${130 + i*5}`} stroke="rgb(52, 52, 59)" strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>
      {/* 5. BOTTOM RIGHT CORNER: Massive "Palm" Bush
          Matches Left #5 (Dense Bush) in weight and corner anchoring. */}
      <svg className="absolute -bottom-12 -right-12 w-80 h-80 opacity-45" viewBox="0 0 300 300" style={{ animation: 'gentleSway 6s ease-in-out 0.8s infinite' }}>
        {/* Big Broad Leaf (Background) */}
        {/* Main Fanning Palm Leaf (Foreground) */}
        <path d="M300 300 Q200 200 100 120" stroke="rgb(63, 63, 70)" strokeWidth="2" fill="none" />
        <path d="M120 140 L150 80 L140 160 L180 100 L170 180 L220 130" stroke="rgb(63, 63, 70)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* Base filler */}
        <circle cx="250" cy="280" r="40" fill="rgb(63, 63, 70)" opacity="0.5" />
      </svg>
      
      <style jsx>{`
        @keyframes gentleSway {
          0%, 100% { transform: rotate(-1deg) translateX(0); }
          50% { transform: rotate(1deg) translateX(2px); }
        }
      `}</style>
    </div>
  )
}
// Individual fern sprig for bottom border - multiple variants
function FernSprig({ style, variant = 1 }: { style?: React.CSSProperties; variant?: number }) {
  const variants = {
    1: ( // Classic symmetric fern
      <>
        <path d="M20 100 Q18 70 20 40 Q22 20 20 0" stroke="rgb(82, 82, 91)" strokeWidth="1.5" fill="none" />
        <path d="M20 85 Q10 78 5 70" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 70 Q8 60 2 50" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 55 Q10 45 5 35" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 40 Q12 32 8 22" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 85 Q30 78 35 70" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 70 Q32 60 38 50" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 55 Q30 45 35 35" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 40 Q28 32 32 22" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <ellipse cx="8" cy="72" rx="3" ry="6" fill="rgb(63, 63, 70)" opacity="0.5" transform="rotate(-30 8 72)" />
        <ellipse cx="5" cy="52" rx="3" ry="6" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(-35 5 52)" />
        <ellipse cx="32" cy="72" rx="3" ry="6" fill="rgb(63, 63, 70)" opacity="0.5" transform="rotate(30 32 72)" />
        <ellipse cx="35" cy="52" rx="3" ry="6" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(35 35 52)" />
      </>
    ),
    2: ( // Curved drooping fern
      <>
        <path d="M20 100 Q15 75 18 50 Q22 25 25 0" stroke="rgb(82, 82, 91)" strokeWidth="1.5" fill="none" />
        <path d="M18 80 Q5 72 0 60" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M17 60 Q3 50 -2 35" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M19 45 Q8 35 5 20" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M19 85 Q28 80 32 72" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M18 65 Q30 58 36 45" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <ellipse cx="3" cy="65" rx="4" ry="7" fill="rgb(63, 63, 70)" opacity="0.5" transform="rotate(-35 3 65)" />
        <ellipse cx="0" cy="40" rx="3" ry="6" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(-40 0 40)" />
        <ellipse cx="30" cy="75" rx="3" ry="5" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(25 30 75)" />
      </>
    ),
    3: ( // Tall sparse fern
      <>
        <path d="M20 100 Q19 65 20 30 Q21 15 20 0" stroke="rgb(82, 82, 91)" strokeWidth="1.2" fill="none" />
        <path d="M20 90 Q12 85 8 78" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M20 75 Q10 68 5 58" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M20 55 Q12 48 8 38" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M20 35 Q14 28 12 18" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M20 90 Q28 85 32 78" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M20 75 Q30 68 35 58" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M20 55 Q28 48 32 38" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M20 35 Q26 28 28 18" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <ellipse cx="10" cy="80" rx="2" ry="4" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(-30 10 80)" />
        <ellipse cx="7" cy="60" rx="2" ry="4" fill="rgb(63, 63, 70)" opacity="0.35" transform="rotate(-35 7 60)" />
        <ellipse cx="30" cy="80" rx="2" ry="4" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(30 30 80)" />
      </>
    ),
    4: ( // Dense bushy fern
      <>
        <path d="M20 100 Q18 70 20 40 Q22 20 20 5" stroke="rgb(82, 82, 91)" strokeWidth="1.8" fill="none" />
        <path d="M20 90 Q8 82 2 72" stroke="rgb(82, 82, 91)" strokeWidth="1.2" fill="none" />
        <path d="M20 82 Q6 72 0 58" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 70 Q5 58 -2 42" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 58 Q8 48 4 32" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M20 90 Q32 82 38 72" stroke="rgb(82, 82, 91)" strokeWidth="1.2" fill="none" />
        <path d="M20 82 Q34 72 40 58" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 70 Q35 58 42 42" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 58 Q32 48 36 32" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <ellipse cx="5" cy="75" rx="4" ry="8" fill="rgb(63, 63, 70)" opacity="0.6" transform="rotate(-28 5 75)" />
        <ellipse cx="2" cy="55" rx="4" ry="7" fill="rgb(63, 63, 70)" opacity="0.5" transform="rotate(-32 2 55)" />
        <ellipse cx="35" cy="75" rx="4" ry="8" fill="rgb(63, 63, 70)" opacity="0.6" transform="rotate(28 35 75)" />
        <ellipse cx="38" cy="55" rx="4" ry="7" fill="rgb(63, 63, 70)" opacity="0.5" transform="rotate(32 38 55)" />
      </>
    ),
    5: ( // Delicate thin fern
      <>
        <path d="M20 100 Q19 70 20 40 Q21 20 20 0" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M20 88 Q14 84 10 78" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 78 Q12 72 7 64" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 68 Q13 62 9 52" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 58 Q14 52 11 42" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 48 Q15 43 13 35" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 88 Q26 84 30 78" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 78 Q28 72 33 64" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 68 Q27 62 31 52" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 58 Q26 52 29 42" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <path d="M20 48 Q25 43 27 35" stroke="rgb(82, 82, 91)" strokeWidth="0.6" fill="none" />
        <ellipse cx="12" cy="80" rx="2" ry="3" fill="rgb(63, 63, 70)" opacity="0.35" transform="rotate(-25 12 80)" />
        <ellipse cx="28" cy="80" rx="2" ry="3" fill="rgb(63, 63, 70)" opacity="0.35" transform="rotate(25 28 80)" />
      </>
    ),
    6: ( // Asymmetric wild fern
      <>
        <path d="M22 100 Q18 72 20 45 Q24 22 22 0" stroke="rgb(82, 82, 91)" strokeWidth="1.4" fill="none" />
        <path d="M19 85 Q6 78 0 65" stroke="rgb(82, 82, 91)" strokeWidth="1.1" fill="none" />
        <path d="M18 65 Q4 55 -3 38" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M19 48 Q10 40 8 25" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M21 88 Q32 82 38 70" stroke="rgb(82, 82, 91)" strokeWidth="0.9" fill="none" />
        <path d="M21 70 Q28 65 32 55" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <ellipse cx="3" cy="72" rx="5" ry="9" fill="rgb(63, 63, 70)" opacity="0.55" transform="rotate(-32 3 72)" />
        <ellipse cx="0" cy="45" rx="4" ry="7" fill="rgb(63, 63, 70)" opacity="0.45" transform="rotate(-38 0 45)" />
        <ellipse cx="35" cy="75" rx="3" ry="5" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(28 35 75)" />
      </>
    ),
  }

  return (
    <svg 
      viewBox="0 0 40 100" 
      className="opacity-40"
      style={{ 
        ...style, 
        animation: `fernSway 4s ease-in-out ${style?.animationDelay || '0s'} infinite`,
        transformOrigin: 'bottom center'
      }}
    >
      {variants[variant as keyof typeof variants] || variants[1]}
      <style jsx>{`
        @keyframes fernSway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
      `}</style>
    </svg>
  )
}

// Full-width decorative fern divider that spans the entire horizontal bar
function SectionFernDecor({ className = "" }: { className?: string }) {
  return (
    // Changed h-full back to a fixed height (h-32 or h-40) so it doesn't explode in size
    <div className={` w-full h-12 opacity-30 overflow-hidden ${className}`}>
      <svg 
        viewBox="0 0 1200 100" 
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Base soil layer - Starts near top (y=5) */}
        <path 
          d="M0 5 Q50 3 100 7 Q150 4 200 9 Q250 6 300 8 Q350 4 400 11 Q450 7 500 6 Q550 9 600 4 Q650 7 700 6 Q750 9 800 7 Q850 4 900 9 Q950 6 1000 7 Q1050 11 1100 6 Q1150 7 1200 9 L1200 100 L0 100 Z" 
          fill="rgb(82, 82, 91)"
        />
        
        {/* Soil texture - Starts at very top (y=0) */}
        <path 
          d="M0 0 Q50 3 100 0 Q150 2 200 0 Q250 1 300 0 Q350 3 400 0 Q450 1 500 2 Q550 0 600 3 Q650 1 700 2 Q750 0 800 1 Q850 3 900 0 Q950 2 1000 1 Q1050 0 1100 2 Q1150 1 1200 0 L1200 100 L0 100 Z" 
          fill="rgb(63, 63, 70)"
        />
        
        {/* Dirt clumps and particles scattered full height */}
        <circle cx="40" cy="20" r="3" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="85" cy="85" r="2.2" fill="rgb(39, 39, 42)" opacity="0.7" />
        <circle cx="120" cy="35" r="2.8" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="165" cy="75" r="2" fill="rgb(39, 39, 42)" opacity="0.6" />
        <circle cx="210" cy="15" r="3.5" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="245" cy="55" r="2.4" fill="rgb(39, 39, 42)" opacity="0.7" />
        <circle cx="290" cy="90" r="3.2" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="335" cy="25" r="2.1" fill="rgb(39, 39, 42)" opacity="0.6" />
        <circle cx="380" cy="65" r="2.7" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="425" cy="10" r="3.3" fill="rgb(39, 39, 42)" opacity="0.7" />
        <circle cx="470" cy="45" r="2.1" fill="rgb(39, 39, 42)" opacity="0.6" />
        <circle cx="515" cy="80" r="2.9" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="560" cy="30" r="2.4" fill="rgb(39, 39, 42)" opacity="0.7" />
        <circle cx="605" cy="95" r="3.2" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="650" cy="40" r="2.3" fill="rgb(39, 39, 42)" opacity="0.6" />
        <circle cx="695" cy="15" r="2.8" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="740" cy="70" r="3.4" fill="rgb(39, 39, 42)" opacity="0.7" />
        <circle cx="785" cy="25" r="2" fill="rgb(39, 39, 42)" opacity="0.6" />
        <circle cx="830" cy="85" r="3.1" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="875" cy="35" r="2.4" fill="rgb(39, 39, 42)" opacity="0.7" />
        <circle cx="920" cy="12" r="3.3" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="965" cy="55" r="2.2" fill="rgb(39, 39, 42)" opacity="0.6" />
        <circle cx="1010" cy="92" r="2.9" fill="rgb(39, 39, 42)" opacity="0.8" />
        <circle cx="1055" cy="28" r="2.7" fill="rgb(39, 39, 42)" opacity="0.7" />
        <circle cx="1100" cy="65" r="2.3" fill="rgb(39, 39, 42)" opacity="0.6" />
        <circle cx="1145" cy="15" r="3.2" fill="rgb(39, 39, 42)" opacity="0.8" />
        
        {/* Additional smaller particles for texture */}
        <circle cx="60" cy="10" r="1.5" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="140" cy="90" r="1.3" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="220" cy="40" r="1.7" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="310" cy="15" r="1.4" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="390" cy="80" r="1.5" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="490" cy="25" r="1.3" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="570" cy="60" r="1.7" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="670" cy="15" r="1.4" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="760" cy="85" r="1.5" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="850" cy="30" r="1.3" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="940" cy="70" r="1.7" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="1030" cy="20" r="1.4" fill="rgb(39, 39, 42)" opacity="0.5" />
        <circle cx="1120" cy="50" r="1.5" fill="rgb(39, 39, 42)" opacity="0.5" />
        
        {/* Small pebbles/rocks */}
        <ellipse cx="110" cy="25" rx="4" ry="2.5" fill="rgb(82, 82, 91)" opacity="0.9" />
        <ellipse cx="280" cy="85" rx="3.5" ry="2.2" fill="rgb(82, 82, 91)" opacity="0.9" />
        <ellipse cx="450" cy="45" rx="4.2" ry="2.8" fill="rgb(82, 82, 91)" opacity="0.9" />
        <ellipse cx="620" cy="15" rx="3.8" ry="2.4" fill="rgb(82, 82, 91)" opacity="0.9" />
        <ellipse cx="790" cy="65" rx="4.1" ry="2.7" fill="rgb(82, 82, 91)" opacity="0.9" />
        <ellipse cx="960" cy="30" rx="3.6" ry="2.3" fill="rgb(82, 82, 91)" opacity="0.9" />
        <ellipse cx="1130" cy="80" rx="4" ry="2.5" fill="rgb(82, 82, 91)" opacity="0.9" />
      </svg>
    </div>
  )
}

// Full-height section fern that spans from border to border
function SectionFern({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  
  return (
    <div 
      className={`absolute top-0 bottom-0 ${isLeft ? 'left-0' : 'right-0'} w-24 opacity-15 pointer-events-none overflow-hidden`}
      style={{ transform: isLeft ? 'none' : 'scaleX(-1)' }}
    >
      <svg 
        viewBox="0 0 100 500" 
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Main stem that spans the full height */}
        <path d="M60 500 Q55 400 58 300 Q62 200 57 100 Q55 50 58 0" stroke="rgb(82, 82, 91)" strokeWidth="2" fill="none" />
        
        {/* Fern fronds at various heights */}
        <path d="M58 480 Q30 465 10 445" stroke="rgb(82, 82, 91)" strokeWidth="1.2" fill="none" />
        <path d="M58 450 Q25 430 5 400" stroke="rgb(82, 82, 91)" strokeWidth="1.2" fill="none" />
        <path d="M58 410 Q30 390 15 360" stroke="rgb(82, 82, 91)" strokeWidth="1.2" fill="none" />
        <path d="M58 370 Q28 345 10 310" stroke="rgb(82, 82, 91)" strokeWidth="1.1" fill="none" />
        <path d="M58 330 Q32 305 18 270" stroke="rgb(82, 82, 91)" strokeWidth="1.1" fill="none" />
        <path d="M58 285 Q30 260 12 225" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M57 240 Q28 215 10 180" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
        <path d="M57 195 Q32 170 15 135" stroke="rgb(82, 82, 91)" strokeWidth="0.9" fill="none" />
        <path d="M57 150 Q30 125 18 90" stroke="rgb(82, 82, 91)" strokeWidth="0.9" fill="none" />
        <path d="M58 105 Q35 85 25 55" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        <path d="M58 65 Q40 50 35 25" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
        
        {/* Leaf shapes */}
        <ellipse cx="18" cy="455" rx="8" ry="14" fill="rgb(63, 63, 70)" opacity="0.6" transform="rotate(-30 18 455)" />
        <ellipse cx="12" cy="410" rx="8" ry="14" fill="rgb(63, 63, 70)" opacity="0.55" transform="rotate(-35 12 410)" />
        <ellipse cx="20" cy="370" rx="7" ry="12" fill="rgb(63, 63, 70)" opacity="0.5" transform="rotate(-28 20 370)" />
        <ellipse cx="15" cy="320" rx="7" ry="13" fill="rgb(63, 63, 70)" opacity="0.5" transform="rotate(-32 15 320)" />
        <ellipse cx="18" cy="270" rx="6" ry="11" fill="rgb(63, 63, 70)" opacity="0.45" transform="rotate(-30 18 270)" />
        <ellipse cx="15" cy="220" rx="6" ry="11" fill="rgb(63, 63, 70)" opacity="0.45" transform="rotate(-35 15 220)" />
        <ellipse cx="18" cy="170" rx="5" ry="10" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(-28 18 170)" />
        <ellipse cx="22" cy="125" rx="5" ry="9" fill="rgb(63, 63, 70)" opacity="0.4" transform="rotate(-32 22 125)" />
        <ellipse cx="28" cy="80" rx="4" ry="8" fill="rgb(63, 63, 70)" opacity="0.35" transform="rotate(-35 28 80)" />
        <ellipse cx="38" cy="40" rx="3" ry="6" fill="rgb(63, 63, 70)" opacity="0.3" transform="rotate(-40 38 40)" />
      </svg>
     
    </div>
  )
}

// Declare CardItem type before using it
type CardItem = {
  id: string;
  name: string;
  designation: string;
  content: string;
}

const chromeExtensionPanels = [
  {
    title: "Clip job details",
    description: "Capture job posts in one click so you always know where you applied.",
    icon: Target,
  },
  {
    title: "Track interview stages",
    description: "Move applications through stages to see momentum at a glance.",
    icon: TrendingUp,
  },
  {
    title: "Never miss follow-ups",
    description: "Get reminders for every recruiter touchpoint and next action.",
    icon: Clock,
  },
] as const



const faqItems = [
  {
    question: "Is ferm free to use?",
    answer:
      "Yes! ferm offers a generous free tier that includes tracking up to 50 applications. Premium features like AI follow-ups and advanced analytics are available in our Pro plan.",
  },
  {
    question: "How does the Chrome extension work?",
    answer:
      "Our extension automatically detects job postings on popular job boards. With one click, it captures the job title, company, requirements, and URL directly to your ferm dashboard.",
  },
  {
    question: "Can I import existing applications?",
    answer:
      "Absolutely! You can import applications via CSV, or manually add them. We also support importing from popular job tracking spreadsheets and other tools.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Your data is encrypted at rest and in transit. We never share your personal information with third parties, and you can export or delete your data at any time.",
  },
]

const stats = [
  { value: "10+", label: "Active job seekers" },
  { value: "85%", label: "Improved interview readiness" },
  { value: "2.5x", label: "Consistent follow-ups" },
  { value: "100+", label: "Jobs tracked" },
]

const interactiveWords = ["application", "interview", "follow-up", "opportunity"]

const superchargeFeatures = [
  {
    id: "interview-prep",
    title: "AI Interview Prep",
    description: "Practice with personalized questions",
    icon: MessageSquare,
    bentoContent: {
      headline: "Practice with AI-generated questions",
      subtext: "Get personalized interview questions based on the job description and company. Practice your answers and get instant feedback.",
      features: [
        { label: "Sample question", value: '"Tell me about a time you handled a difficult stakeholder..."' },
        { label: "AI feedback", value: "Great use of STAR method!" },
        { label: "Questions generated", value: "500+" },
        { label: "Success rate", value: "94%" },
      ]
    }
  },
  {
    id: "job-scoring",
    title: "Job Scoring",
    description: "AI-powered match analysis",
    icon: Star,
    bentoContent: {
      headline: "Know your match before you apply",
      subtext: "AI analyzes job requirements against your profile to show compatibility and highlight skill gaps.",
      features: [
        { label: "Match score", value: "87%" },
        { label: "Skills matched", value: "12/14" },
        { label: "Experience fit", value: "Strong" },
        { label: "Culture alignment", value: "High" },
      ]
    }
  },
  {
    id: "follow-ups",
    title: "Follow-up Emails",
    description: "Context-aware drafts in seconds",
    icon: Mail,
    bentoContent: {
      headline: "Draft follow-ups in seconds",
      subtext: "Context-aware follow-ups that sound like you. Never miss the right moment to reconnect.",
      features: [
        { label: "Tone", value: "Professional & warm" },
        { label: "Context", value: "Auto-pulled from history" },
        { label: "Timing", value: "AI-suggested" },
        { label: "Templates", value: "25+" },
      ]
    }
  },
  {
    id: "insights",
    title: "Analytics",
    description: "Track your job search progress",
    icon: TrendingUp,
    bentoContent: {
      headline: "Data-driven job search insights",
      subtext: "Understand what's working and optimize your approach with detailed analytics.",
      features: [
        { label: "Response rate", value: "23%" },
        { label: "Avg. time to interview", value: "8 days" },
        { label: "Top performing roles", value: "SWE, PM" },
        { label: "Best application days", value: "Tue, Wed" },
      ]
    }
  },
]

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      prefetch={false}
      target="_blank"
      rel="noreferrer"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  )
}

export default function LandingPage() {
  const [isVideoOpen, setIsVideoOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<string>("interview-prep")

  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])

  // Typewriter effect
  useEffect(() => {
    const currentWord = interactiveWords[currentWordIndex]
    const typeSpeed = 80
    const deleteSpeed = 50
    const pauseTime = 1500

    if (!isDeleting && displayedText === currentWord) {
      // Pause before deleting
      const timeout = setTimeout(() => setIsDeleting(true), pauseTime)
      return () => clearTimeout(timeout)
    }

    if (isDeleting && displayedText === "") {
      // Move to next word
      setIsDeleting(false)
      setCurrentWordIndex((prev) => (prev + 1) % interactiveWords.length)
      return
    }

    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayedText(currentWord.slice(0, displayedText.length - 1))
      } else {
        setDisplayedText(currentWord.slice(0, displayedText.length + 1))
      }
    }, isDeleting ? deleteSpeed : typeSpeed)

    return () => clearTimeout(timeout)
  }, [displayedText, isDeleting, currentWordIndex])

  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="fixed top-0 right-0 left-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>ferm</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-muted-foreground">
                Create an account
              </Button>
              <Button className="gap-2">
                Sign in
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section - Centered with static fern plants at bottom */}
        <section ref={heroRef} className="relative overflow-hidden pt-24 bg-zinc-900">
          {/* Subtle forest floor texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
          
          <motion.div
            style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
            className="relative mx-auto max-w-6xl px-6 py-20 lg:py-32"
          >
            {/* Centered hero content */}
            <div className="flex flex-col items-center text-center gap-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground"
              >
                <Sparkles className="h-4 w-4" />
                Now with AI-powered Interview Prep
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl max-w-4xl"
              >
                Stop forgetting where every{" "}
                <span className="relative inline-block min-w-[200px]">
                  <span className="border-b-2 border-foreground">
                    {displayedText}
                  </span>
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                    className="inline-block w-0.5 h-[1em] bg-foreground ml-0.5 align-middle"
                  />
                </span>{" "}
                stands
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-2xl text-lg leading-relaxed text-muted-foreground"
              >
                ferm centralizes the process of managing your job hunt journey, embracing simplicity without another spreadsheet
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <Button size="lg" className="gap-2 px-8">
                  Get started, it's free!
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Button>
               <Button size="lg" variant="outline" asChild className="gap-2 bg-transparent">
                
  <Link href="https://ko-fi.com/adriancosentino" target="_blank" rel="noreferrer">
    Support Me
    <Heart className="w-4 h-4 text-gray-500 opacity-50" /> 
  </Link>
  
</Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex items-center justify-center gap-6 pt-4 text-muted-foreground"
              >
                <SocialLink href="https://www.linkedin.com/company/111001355" label="LinkedIn">
                  <Linkedin className="h-5 w-5" aria-hidden />
                </SocialLink>
                <SocialLink href="https://www.youtube.com/@ferm-dot-dev" label="Youtube">
                  <Youtube className="h-5 w-5" aria-hidden />
                </SocialLink>
                <SocialLink href="https://x.com/fermdotdev" label="Twitter">
                  <Twitter className="h-5 w-5" aria-hidden />
                </SocialLink>
              </motion.div>
            </div>
          </motion.div>
          {/* Leaf Border Frame surrounding the hero */}
          <LeafBorderFrame />
        </section>

        {/* Stats Banner - Marquee (dark gray) */}
        <section className="border-y border-border bg-zinc-900 overflow-hidden">
          <div className="py-8">
            <div className="relative flex overflow-hidden">
              {/* Gradient masks for smooth fade */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-zinc-900 to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-zinc-900 to-transparent" />
              
              {/* Marquee animation */}
              <motion.div
                className="flex gap-16 pr-16"
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  x: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 20,
                    ease: "linear",
                  },
                }}
              >
                {/* Double the stats for seamless loop */}
                {[...stats, ...stats, ...stats, ...stats].map((stat, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 whitespace-nowrap"
                  >
                    <span className="text-3xl font-bold text-foreground sm:text-4xl">{stat.value}</span>
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <span className="text-muted-foreground/30 text-2xl">{"\u2022"}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Chrome Extension Section - Tabbed cards with preview (darker gray) */}
        <section className="py-24 bg-zinc-800 relative overflow-hidden">
          {/* Full-height fern on left (Section 1) */}
          <SectionFern side="left" />
          <SectionFern side="right" />
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium">
                <Target className="h-4 w-4 text-foreground" />
                Chrome Extension
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Capture opportunities instantly
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our browser extension makes job tracking effortless. Clip, organize, and never lose track of where you applied.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-start">
                {/* Feature tabs - Vertical stacked cards */}
                <div className="flex flex-col gap-3">
                {chromeExtensionPanels.map((panel, index) => {
                  const isActive = index === activeIndex
                  const Icon = panel.icon

                  return (
                    <button
                      key={panel.title}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`group relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 ${
                        isActive
                          ? "border-foreground/30 bg-muted shadow-lg"
                          : "border-border bg-card hover:border-foreground/20 hover:bg-card/80"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            isActive ? "bg-foreground text-background" : "bg-muted text-muted-foreground group-hover:bg-foreground/10 group-hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{panel.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{panel.description}</p>
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 text-muted-foreground transition-transform ${isActive ? "rotate-90 text-foreground" : ""}`}
                        />
                      </div>
                    </button>
                  )
                })}
                </div>

                {/* Preview area - Browser mockup */}
                <div className="relative">
                  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                    <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
                      <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500/70" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                        <div className="h-3 w-3 rounded-full bg-green-500/70" />
                      </div>
                      <div className="ml-4 flex-1 rounded-lg bg-background/50 px-4 py-1.5 text-xs text-muted-foreground">
                        linkedin.com/jobs/view/...
                      </div>
                    </div>
                    <div className="aspect-[16/10] bg-gradient-to-br from-muted/20 to-muted/5 p-8">
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                            {(() => {
                              const Icon = chromeExtensionPanels[activeIndex].icon
                              return <Icon className="h-8 w-8 text-foreground" />
                            })()}
                          </div>
                          <p className="text-lg font-medium text-foreground">{chromeExtensionPanels[activeIndex].title}</p>
                          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                            {chromeExtensionPanels[activeIndex].description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Floating badge */}
                 
                </div>
              </div>
          </div>
        </section>

        {/* Fern section divider */}
        <SectionFernDecor className="py-2 bg-zinc-700" />

        {/* AI Section - Clickable feature cards with bento expansion (dark gray) */}
        <section className="border-y border-border bg-zinc-900 py-24 relative overflow-hidden">
          {/* Full-height fern on right (Section 2) */}
          <SectionFern side="right" />
          <SectionFern side="left" />
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground">
                <Brain className="h-4 w-4" />
                AI-Powered
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Supercharge your job search with AI
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Let AI handle the tedious parts so you can focus on landing your dream job.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {superchargeFeatures.map((feature) => {
                  const Icon = feature.icon
                  const isSelected = selectedFeature === feature.id
                  
                  return (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => setSelectedFeature(feature.id)}
                      className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 ${
                        isSelected
                          ? "border-foreground/40 bg-muted shadow-xl ring-1 ring-foreground/20"
                          : "border-border bg-card hover:border-foreground/20 hover:shadow-lg"
                      }`}
                    >
                      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                        isSelected ? "bg-foreground text-background" : "bg-muted text-foreground group-hover:bg-foreground/10"
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                      <div className={`absolute right-4 top-4 transition-transform ${isSelected ? "rotate-45" : ""}`}>
                        <div className={`h-2 w-2 rounded-full ${isSelected ? "bg-foreground" : "bg-muted-foreground/50"}`} />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Expanded Bento Content - Always visible, smooth transition between features */}
              <div className="mt-6">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={selectedFeature}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {(() => {
                      const feature = superchargeFeatures.find(f => f.id === selectedFeature)
                      if (!feature) return null
                      const Icon = feature.icon
                      
                      return (
                        <div className="rounded-3xl border border-border bg-card p-8">
                          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                            {/* Left side - Main content */}
                            <div>
                              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
                                <Icon className="h-4 w-4" />
                                {feature.title}
                              </div>
                              <h3 className="text-2xl font-bold text-foreground">
                                {feature.bentoContent.headline}
                              </h3>
                              <p className="mt-3 text-muted-foreground">
                                {feature.bentoContent.subtext}
                              </p>
                              <Button className="mt-6 gap-2">
                                Try it now
                                <ArrowUpRight className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Right side - Feature grid */}
                            <div className="grid grid-cols-2 gap-3">
                              {feature.bentoContent.features.map((item, idx) => (
                                <motion.div
                                  key={item.label}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="rounded-xl border border-border/50 bg-background/50 p-4"
                                >
                                  <p className="text-xs text-muted-foreground">{item.label}</p>
                                  <p className="mt-1 font-medium text-foreground text-sm">{item.value}</p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          
                          {/* GIF/Demo area - Full width */}
                          <div className="mt-8 rounded-2xl border border-border/50 bg-muted/30 overflow-hidden">
                            <div className="aspect-[21/9] flex items-center justify-center">
                              <div className="text-center text-muted-foreground">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                                  <Icon className="h-6 w-6" />
                                </div>
                                <p className="text-sm">Feature demo GIF</p>
                                <p className="text-xs mt-1">Replace with your GIF</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>
          </div>
        </section>

        {/* Fern section divider */}
        <SectionFernDecor className="py-2 bg-zinc-700" />

        {/* Definition Section - Dictionary style (clean, no container) */}
        <section className="py-24 bg-zinc-800 relative overflow-hidden">
          {/* Full-height fern on left (Section 3) */}
          <SectionFern side="left" />
          <SectionFern side="right" />
          <div className="mx-auto max-w-3xl px-6">
            <div className="flex flex-wrap items-baseline gap-4 mb-2">
              <h2 className="text-5xl sm:text-6xl font-serif font-bold tracking-tight text-foreground">serendipity</h2>
              <span className="text-lg text-muted-foreground italic">/ˌser.ənˈdɪp.ə.ti/</span>
              <span className="rounded border border-muted-foreground/50 px-2 py-0.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">noun</span>
            </div>
            <p className="text-sm text-muted-foreground mb-8">also: ser·en·dip·i·ty | ser-en-dip-i-ty</p>
            <div className="border-t border-border mb-8" />
            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="text-amber-600 font-medium">1</span>
                <div>
                  <p className="text-foreground">
                    <span className="font-semibold text-amber-600">ferm turns serendipity into a feature:</span>{" "}
                    Explore your applications at random, or receive daily curated reviews to rediscover opportunities you&apos;ve tracked in the past.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-amber-600 font-medium">2</span>
                <div>
                  <p className="text-foreground">
                    <span className="font-semibold text-amber-600">Connect the dots:</span>{" "}
                    From job boards, LinkedIn, or emails. When you&apos;re looking for something, ferm connects the dots you wouldn&apos;t.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-12 py-6 border-t border-border">
              <p className="text-lg italic text-amber-600/90">
                &ldquo;Sometimes you read and highlight something but the timing isn&apos;t right. ferm helps brings it back when you&apos;re ready to learn from it.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* Fern section divider */}
        <SectionFernDecor className="py-2 bg-zinc-700" />

        {/* FAQ Section - Two column layout with decorative elements (dark gray) */}
        <section className="py-24 bg-zinc-900 relative overflow-hidden">
          {/* Full-height fern on right (Section 4) */}
          <SectionFern side="left" />
          <SectionFern side="right" />
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:items-start">
              <div className="lg:sticky lg:top-32">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Frequently asked questions
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Everything you need to know about ferm. Can&apos;t find what you&apos;re looking for?
                </p>
                <Button variant="outline" className="mt-6 gap-2 bg-transparent" asChild>
                  <Link href="mailto:support@ferm.dev">
                    Get in touch
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-card/50 p-6">
                <Accordion type="single" collapsible className="space-y-4">
                  {faqItems.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`faq-item-${index}`}
                      className="rounded-xl border border-border bg-background px-6 data-[state=open]:border-foreground/30 data-[state=open]:bg-muted/30"
                    >
                      <AccordionTrigger className="py-4 text-left font-medium hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </section>

        {/* Fern section divider */}
        <SectionFernDecor className="py-2 bg-zinc-700" />
                  
        {/* CTA Section - Full width gradient (darker gray) */}
        <section className="border-y border-border bg-zinc-800 py-20 relative overflow-hidden">
          <SectionFern side="left" />
          <SectionFern side="right" />
          {/* Full-height fern on left (Section 5) */}
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to take control of your job search?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Join thousands of job seekers who are landing more interviews with ferm.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" className="gap-2 px-8">
                  Get Started Free
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setIsVideoOpen(true)} className="gap-2 bg-transparent">
                  <Play className="h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

         <SectionFernDecor className="py-2 bg-zinc-700" />
        {/* Footer - Modern minimal (dark gray) */}
        <footer className="border-t border-border bg-zinc-900 py-16 relative overflow-hidden">
          {/* Decorative fern spray at bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-8 opacity-10 pointer-events-none">
            <svg viewBox="0 0 60 80" className="w-10 h-16" style={{ animation: 'gentleSway 5s ease-in-out infinite' }}>
              <path d="M30 80 Q28 50 30 25 Q32 10 30 0" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
              <path d="M30 60 Q18 52 10 42" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
              <path d="M30 40 Q15 30 8 18" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
            </svg>
            <svg viewBox="0 0 60 80" className="w-12 h-20" style={{ animation: 'gentleSway 4.5s ease-in-out 0.2s infinite' }}>
              <path d="M30 80 Q28 50 30 25 Q32 10 30 0" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
              <path d="M30 60 Q18 52 10 42" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
              <path d="M30 40 Q15 30 8 18" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
            </svg>
            <svg viewBox="0 0 60 80" className="w-10 h-16" style={{ transform: 'scaleX(-1)', animation: 'gentleSway 5.2s ease-in-out 0.4s infinite' }}>
              <path d="M30 80 Q28 50 30 25 Q32 10 30 0" stroke="rgb(82, 82, 91)" strokeWidth="1" fill="none" />
              <path d="M30 60 Q18 52 10 42" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
              <path d="M30 40 Q15 30 8 18" stroke="rgb(82, 82, 91)" strokeWidth="0.8" fill="none" />
            </svg>
          </div>
          <div className="mx-auto max-w-6xl px-6">
              <div className="grid gap-12 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Link href="/" className="flex items-center gap-2 text-lg font-bold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                      <Zap className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span>ferm</span>
                  </Link>
                  <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                    The modern job application tracker that helps you land more interviews with less chaos.
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <SocialLink href="https://www.linkedin.com/company/111001355" label="LinkedIn">
                      <Linkedin className="h-5 w-5" aria-hidden />
                    </SocialLink>
                    <SocialLink href="https://www.youtube.com/@ferm-dot-dev" label="Youtube">
                      <Youtube className="h-5 w-5" aria-hidden />
                    </SocialLink>
                    <SocialLink href="https://x.com/fermdotdev" label="Twitter">
                      <Twitter className="h-5 w-5" aria-hidden />
                    </SocialLink>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Product</h4>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Features</Link></li>
                    <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Pricing</Link></li>
                    <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Chrome Extension</Link></li>
                    <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Changelog</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground">Company</h4>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">About</Link></li>
                    <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Blog</Link></li>
                    <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Privacy</Link></li>
                    <li><Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">Terms</Link></li>
                  </ul>
                </div>
              </div>

              <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} ferm. All rights reserved.
                </p>
                <p className="text-sm text-muted-foreground">
                  Made with care for job seekers everywhere.
                </p>
              </div>
            </div>
        </footer>
      </div>

      {/* Video Dialog */}
      <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
        <DialogContent
          className="w-[90vw] max-w-6xl overflow-hidden border-border p-0 sm:max-w-[1100px]"
          style={{ maxHeight: "90vh" }}
        >
          <div className="relative aspect-video w-full bg-card">
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Video player placeholder</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
