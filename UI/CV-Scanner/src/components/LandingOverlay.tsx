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

export default function LoadingOverlay({
open,
message = "Warming things up…",
percent = null,
detail,
logoSrc,
}: LoadingOverlayProps) {
const [tipIndex, setTipIndex] = React.useState(0);
React.useEffect(() => {
if (!open) return;
const id = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 3000);
return () => clearInterval(id);
}, [open]);

return (
<Fade in={open} mountOnEnter unmountOnExit>
<Box
sx={{
position: "fixed",
inset: 0,
zIndex: (t) => t.zIndex.modal + 1,
bgcolor: "background.default",
'&::before': {
content: '""',
position: "absolute",
inset: 0,
background: (t) =>
`radial-gradient(1200px 600px at 10% -10%, ${t.palette.primary.main}11, transparent),
radial-gradient(900px 500px at 110% 110%, ${t.palette.secondary?.main || t.palette.primary.main}10, transparent)`,
},
display: "grid",
placeItems: "center",
p: 2,
}}
>

    

