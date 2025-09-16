import React from "react";
import {
Box,
CircularProgress,
LinearProgress,
Typography,
Fade,
Paper,
} from "@mui/material";

export type LoadingOverlayProps = {
/** Controls visibility */
open: boolean;
/** Optional main message */
message?: string;
/** Optional percentage (0-100). If provided, the bar becomes determinate */
percent?: number | null;
/** Additional detail line (e.g., which step is running) */
detail?: string;
/** Show small brand/logo image if you have one */
logoSrc?: string;
};


const tips = [
"Pro tip: You can upload multiple files at once.",
"Hint: Use filters to narrow down your results.",
"Did you know? You can press / to jump to search.",
"Saving power: heavy tasks run in the background efficiently.",
];

