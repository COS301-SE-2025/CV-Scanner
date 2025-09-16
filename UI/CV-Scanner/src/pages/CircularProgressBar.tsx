import React from "react";
import { Box, Typography } from "@mui/material";

interface CircularProgressBarProps {
  value: number; // percentage 0-100
  label: string;
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({ value, label }) => {
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", m: 2 }}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#eee"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#grad)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 1s ease" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Gradient */}
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff0055" />
            <stop offset="100%" stopColor="#9900ff" />
          </linearGradient>
        </defs>
      </svg>
      <Typography sx={{ fontWeight: "bold", mt: -6, position: "absolute" }}>
        {value}%
      </Typography>
      <Typography variant="body2" sx={{ mt: 6, fontWeight: "600" }}>
        {label}
      </Typography>
    </Box>
  );
};

export default CircularProgressBar;
