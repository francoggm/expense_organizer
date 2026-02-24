import React from 'react';
import { Box, Popover, IconButton, Tooltip } from '@mui/material';
import { Palette as PaletteIcon } from '@mui/icons-material';
import { PRESET_COLORS } from '../../utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  size?: 'small' | 'medium' | 'large';
}

export default function ColorPicker({ value, onChange, size = 'medium' }: ColorPickerProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleColorSelect = (color: string) => {
    onChange(color);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? 'color-picker-popover' : undefined;

  const sizeMap = {
    small: 24,
    medium: 32,
    large: 40,
  };

  const colorSize = sizeMap[size];

  return (
    <>
      <Tooltip title="Select color">
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          sx={{
            width: colorSize + 8,
            height: colorSize + 8,
            border: '2px solid',
            borderColor: 'divider',
            bgcolor: value,
            '&:hover': {
              bgcolor: value,
              opacity: 0.8,
            },
          }}
        >
          <PaletteIcon sx={{ color: 'transparent' }} />
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1, maxWidth: 200 }}>
          {PRESET_COLORS.map((color) => (
            <Box
              key={color}
              onClick={() => handleColorSelect(color)}
              sx={{
                width: 28,
                height: 28,
                bgcolor: color,
                borderRadius: 1,
                cursor: 'pointer',
                border: value === color ? '3px solid' : '1px solid',
                borderColor: value === color ? 'primary.main' : 'divider',
                transition: 'transform 0.1s',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            />
          ))}
        </Box>
      </Popover>
    </>
  );
}