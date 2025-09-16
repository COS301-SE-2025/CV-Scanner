import React from "react";
import { Box, Typography } from "@mui/material";

interface CircularProgressBarProps {
  value: number; // percentage 0-100
  label: string;
}

const CircularProgressBar: React.FC<{ value: number; label: string }> = ({
  value,
  label,
}) => {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (value / 100) * circumference;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column", // stack circle + label
        alignItems: "center",
        justifyContent: "center",
        m: 1,
      }}
    >
      {/* Circle with percentage inside */}
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e0e0e0"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#grad1)"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#e91e63" }} />
            <stop offset="100%" style={{ stopColor: "#9c27b0" }} />
          </linearGradient>
        </defs>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#000"
        >
          {`${value}%`}
        </text>
      </svg>

      {/* Label BELOW circle */}
      <Typography
        variant="subtitle2"
        sx={{ mt: 1, textAlign: "center", fontWeight: "medium" }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default CircularProgressBar;
