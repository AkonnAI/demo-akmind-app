import { useId } from 'react'

export default function NovaSVG() {
  const sid = useId().replace(/:/g, '')
  const scanId = `nova-scan-${sid}`

  return (
    <svg
      width="120"
      height="260"
      viewBox="0 0 120 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={scanId} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="4" y2="0" stroke="#00D4FF" strokeWidth="0.5" opacity="0.3" />
        </pattern>
      </defs>
      <rect
        x="30"
        y="20"
        width="60"
        height="55"
        rx="12"
        fill="rgba(0,212,255,0.08)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <ellipse cx="45" cy="44" rx="7" ry="5" fill="#00D4FF" opacity="0.9" />
      <ellipse cx="75" cy="44" rx="7" ry="5" fill="#00D4FF" opacity="0.9" />
      <ellipse cx="45" cy="44" rx="5" ry="3" fill="white" opacity="0.4" />
      <ellipse cx="75" cy="44" rx="5" ry="3" fill="white" opacity="0.4" />
      <rect x="42" y="60" width="36" height="4" rx="2" fill="#00D4FF" opacity="0.5" />
      <line x1="60" y1="20" x2="60" y2="4" stroke="#00D4FF" strokeWidth="1.5" />
      <circle cx="60" cy="3" r="3" fill="#00D4FF" />
      <rect
        x="50"
        y="75"
        width="20"
        height="12"
        rx="4"
        fill="rgba(0,212,255,0.1)"
        stroke="#00D4FF"
        strokeWidth="1"
      />
      <rect
        x="18"
        y="87"
        width="84"
        height="90"
        rx="14"
        fill="rgba(0,212,255,0.06)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <rect
        x="32"
        y="100"
        width="56"
        height="40"
        rx="8"
        fill="rgba(0,212,255,0.1)"
        stroke="#00D4FF"
        strokeWidth="1"
        opacity="0.7"
      />
      <circle cx="46" cy="115" r="5" fill="#00D4FF" opacity="0.8" />
      <circle cx="60" cy="115" r="5" fill="#7B2FFF" opacity="0.8" />
      <circle cx="74" cy="115" r="5" fill="#00FF88" opacity="0.8" />
      <rect x="34" y="128" width="52" height="5" rx="2" fill="#00D4FF" opacity="0.2" />
      <rect x="34" y="128" width="30" height="5" rx="2" fill="#00D4FF" opacity="0.6" />
      <rect
        x="2"
        y="92"
        width="14"
        height="60"
        rx="7"
        fill="rgba(0,212,255,0.06)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <rect
        x="104"
        y="92"
        width="14"
        height="60"
        rx="7"
        fill="rgba(0,212,255,0.06)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <circle
        cx="9"
        cy="158"
        r="7"
        fill="rgba(0,212,255,0.1)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <circle
        cx="111"
        cy="158"
        r="7"
        fill="rgba(0,212,255,0.1)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <rect
        x="28"
        y="177"
        width="26"
        height="65"
        rx="10"
        fill="rgba(0,212,255,0.06)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <rect
        x="66"
        y="177"
        width="26"
        height="65"
        rx="10"
        fill="rgba(0,212,255,0.06)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <rect
        x="22"
        y="232"
        width="34"
        height="14"
        rx="6"
        fill="rgba(0,212,255,0.1)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <rect
        x="64"
        y="232"
        width="34"
        height="14"
        rx="6"
        fill="rgba(0,212,255,0.1)"
        stroke="#00D4FF"
        strokeWidth="1.5"
      />
      <rect
        x="18"
        y="87"
        width="84"
        height="90"
        rx="14"
        fill={`url(#${scanId})`}
        opacity="0.3"
      />
    </svg>
  )
}
