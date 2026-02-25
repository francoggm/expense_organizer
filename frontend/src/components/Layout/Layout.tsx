import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme as useMuiTheme,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as ShoppingCartIcon,
  People as PeopleIcon,
  Repeat as RepeatIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  SettingsBrightness as SystemModeIcon,
  CalendarMonth as CalendarMonthIcon,
} from '@mui/icons-material';
import { useTheme } from '../../theme';

const DRAWER_WIDTH = 260;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Resumo Mensal', icon: <CalendarMonthIcon />, path: '/monthly-summary' },
  { text: 'Despesas Fixas', icon: <RepeatIcon />, path: '/fixed-bills' },
  { text: 'Despesas Variáveis', icon: <ShoppingCartIcon />, path: '/variable-expenses' },
  { text: 'Pessoas', icon: <PeopleIcon />, path: '/people' },
  { text: 'Relatórios', icon: <BarChartIcon />, path: '/reports' },
  { text: 'Configurações', icon: <SettingsIcon />, path: '/settings' },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  const { mode, setMode, actualMode } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleThemeToggle = () => {
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (mode) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      case 'system':
        return <SystemModeIcon />;
    }
  };

  const getThemeTooltip = () => {
    switch (mode) {
      case 'light':
        return 'Modo claro (clique para escuro)';
      case 'dark':
        return 'Modo escuro (clique para sistema)';
      case 'system':
        return 'Modo sistema (clique para claro)';
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2 }}>
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: 40,
            height: 40,
            mr: 2,
          }}
        >
          💰
        </Avatar>
        <Typography variant="h6" noWrap component="div" fontWeight={600}>
          Organizador de Despesas
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, px: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: location.pathname === item.path ? 'inherit' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          © 2024 Organizador de Despesas
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navItems.find((item) => item.path === location.pathname)?.text || 'Organizador de Despesas'}
          </Typography>
          <Tooltip title={getThemeTooltip()}>
            <IconButton color="inherit" onClick={handleThemeToggle}>
              {getThemeIcon()}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}