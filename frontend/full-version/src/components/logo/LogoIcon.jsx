'use client';

// @mui
import { useTheme } from '@mui/material/styles';
import CardMedia from '@mui/material/CardMedia';
import Box from '@mui/material/Box';

// @project
import branding from '@/branding.json';

/***************************  LOGO - ICON  ***************************/

export default function LogoIcon() {
  const theme = useTheme();
  const logoIconPath = branding.logo.logoIcon;

  return (
    <Box
      sx={{
        width: 1,
        height: 1,
        position: 'relative',
        cursor: 'pointer',
        display: 'block',
        WebkitTapHighlightColor: 'transparent',
        '& svg': {
          display: 'block',
          width: '100%',
          height: '100%'
        }
      }}
    >
      {logoIconPath ? (
        <CardMedia src={logoIconPath} component="img" alt="logo" sx={{ height: 1 }} />
      ) : (
        <svg viewBox="0 0 374 384" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="373.944" height="383.442" rx="48.5085" fill="white" />
          <path
            d="M183.358 101.811C190.257 100.886 207.841 101.738 213.632 105.826C213.428 108.304 208 110.118 205.879 111.096C185.564 120.454 168.808 134.924 159.458 155.55C150.064 176.297 149.413 199.951 157.649 221.184C168.729 250.112 189.223 264.057 216.352 276L216.29 277.064C212.336 280.583 203.507 281.205 198.359 281.637C175.401 283.744 153.007 275.73 135.277 261.321C116.161 245.509 104.139 222.727 101.875 198.023C99.6432 174.604 106.735 151.249 121.612 133.026C137.059 114.418 159.501 103.963 183.358 101.811Z"
            fill="#8754D2"
          />
          <path
            d="M236.311 125.414C240.403 124.858 250.35 124.256 253.741 126.578C253.914 126.994 254.239 127.376 254.26 127.827C254.305 128.809 253.293 130.086 252.653 130.784C249.668 134.037 245.403 136.596 241.966 139.409C231.628 147.937 223.906 159.21 219.687 171.931C211.07 197.181 219.811 224.488 239.894 241.578C243.037 244.253 252.849 249.871 254.351 252.903L253.504 254.177C249.09 256.323 244.481 255.979 239.694 255.962C228.614 254.619 218.89 251.085 209.753 244.566C195.426 234.281 185.816 218.684 183.073 201.262C180.318 183.087 184.972 164.566 195.992 149.851C205.74 136.715 220.069 127.747 236.311 125.414Z"
            fill="#8754D2"
          />
          <path
            d="M262.853 157.657C265.419 157.438 268.54 157.314 271.039 157.986C272.299 158.325 271.883 158.007 272.472 159.047C266.063 165.801 261.715 173.214 260.374 182.527C259.162 190.948 259.859 202.487 264.141 210.012C266.378 213.945 269.514 217.655 272.212 221.296L271.639 222.067C268.879 222.968 266.337 222.951 263.477 222.958C263.285 222.907 263.093 222.859 262.903 222.805L261.952 222.531C260.777 222.199 259.596 221.883 258.47 221.405C251.522 218.455 245.974 211.965 243.126 205.098C239.42 196.165 239.726 184.93 243.525 176.046C247.383 167.027 253.965 161.329 262.853 157.657Z"
            fill="#8754D2"
          />
        </svg>
      )}
    </Box>
  );
}
