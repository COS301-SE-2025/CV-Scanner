import React from "react";
import { Box, Typography } from "@mui/material";

interface CircularProgressBarProps {
  value: number; // 0-100
  label: string;
  colorStart?: string;
  colorEnd?: string;
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  value,
  label,
  colorStart = "#ff0000ff",
  colorEnd = "#0400ffff",
}) => {
  const radius = 70;
  const stroke = 9;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (value / 100) * circumference;

  // Calculate color interpolation between start and end
  const interpolateColor = (start: string, end: string, factor: number) => {
    const hex = (c: string) =>
      c.length === 4
        ? c
            .slice(1)
            .split("")
            .map((x) => x + x)
            .join("")
        : c.slice(1);
    const s = hex(start);
    const e = hex(end);
    const r = Math.round(
      parseInt(s.substring(0, 2), 16) * (1 - factor) +
        parseInt(e.substring(0, 2), 16) * factor
    );
    const g = Math.round(
      parseInt(s.substring(2, 4), 16) * (1 - factor) +
        parseInt(e.substring(2, 4), 16) * factor
    );
    const b = Math.round(
      parseInt(s.substring(4, 6), 16) * (1 - factor) +
        parseInt(e.substring(4, 6), 16) * factor
    );
    return `rgb(${r},${g},${b})`;
  };

  const strokeColor = interpolateColor(colorStart, colorEnd, value / 100);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        m: 1,
      }}
    >
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
          stroke={strokeColor} // dynamically interpolated
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: "stroke-dashoffset 1s ease, stroke 1s ease" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontWeight="bold"
          fill="#000"
        >
          {`${value.toFixed(0)}%`}
        </text>
      </svg>
      <Typography
        variant="subtitle1"
        sx={{ mt: 1, textAlign: "center", fontWeight: "medium" }}
      >
        {label}
      </Typography>
    </Box>
  );
};

export default CircularProgressBar;
