import React, { useState, useEffect } from 'react';
import { 
    BrowserRouter as Router,
    Routes,
    Route,
    Link as RouterLink
} from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Container,
    Box,
    Button,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    ThemeProvider,
    createTheme,
    CssBaseline,
    Avatar,
    Menu,
    MenuItem,
    Divider
} from '@mui/material';
import {
    Search as SearchIcon,
    Upload as UploadIcon,
    Recommend as RecommendIcon,
    Menu as MenuIcon,
    AccountCircle,
    Brightness4,
    Brightness7,
    Settings as SettingsIcon
} from '@mui/icons-material';

import Search from './components/Search/Search';
import Upload from './components/Upload/Upload';
import Recommendations from './components/Recommendations/Recommendations';
import UserPreferences from './components/UserPreferences/UserPreferences';
import ResourceDetail from './components/ResourceDetail/ResourceDetail';

const App = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [userPreferences, setUserPreferences] = useState({
        subjects: [],
        grade: null,
        interests: []
    });

    const theme = createTheme({
        palette: {
            mode: darkMode ? 'dark' : 'light',
            primary: {
                main: '#1976d2'
            },
            secondary: {
                main: '#dc004e'
            }
        }
    });

    useEffect(() => {
        // Load user preferences from localStorage or API
        const loadUserPreferences = async () => {
            try {
                const storedPreferences = localStorage.getItem('userPreferences');
                if (storedPreferences) {
                    setUserPreferences(JSON.parse(storedPreferences));
                }
            } catch (error) {
                console.error('Failed to load user preferences:', error);
            }
        };

        loadUserPreferences();
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleProfileMenuClose = () => {
        setAnchorEl(null);
    };

    const handleThemeToggle = () => {
        setDarkMode(!darkMode);
    };

    const handlePreferencesUpdate = (newPreferences) => {
        setUserPreferences(newPreferences);
    };

    const drawer = (
        <Box>
            <List>
                <ListItem button component={RouterLink} to="/search">
                    <ListItemIcon>
                        <SearchIcon />
                    </ListItemIcon>
                    <ListItemText primary="Search" />
                </ListItem>
                <ListItem button component={RouterLink} to="/upload">
                    <ListItemIcon>
                        <UploadIcon />
                    </ListItemIcon>
                    <ListItemText primary="Upload" />
                </ListItem>
                <ListItem button component={RouterLink} to="/recommendations">
                    <ListItemIcon>
                        <RecommendIcon />
                    </ListItemIcon>
                    <ListItemText primary="Recommendations" />
                </ListItem>
                <ListItem button component={RouterLink} to="/preferences">
                    <ListItemIcon>
                        <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Preferences" />
                </ListItem>
            </List>
        </Box>
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                    <AppBar position="fixed">
                        <Toolbar>
                            <IconButton
                                color="inherit"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ mr: 2, display: { sm: 'none' } }}
                            >
                                <MenuIcon />
                            </IconButton>

                            <Typography 
                                variant="h6" 
                                component={RouterLink} 
                                to="/"
                                sx={{ 
                                    flexGrow: 1,
                                    textDecoration: 'none',
                                    color: 'inherit'
                                }}
                            >
                                EduGuide
                            </Typography>

                            <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>
                                <Button 
                                    color="inherit" 
                                    component={RouterLink} 
                                    to="/search"
                                    startIcon={<SearchIcon />}
                                >
                                    Search
                                </Button>
                                <Button 
                                    color="inherit" 
                                    component={RouterLink} 
                                    to="/upload"
                                    startIcon={<UploadIcon />}
                                >
                                    Upload
                                </Button>
                                <Button 
                                    color="inherit" 
                                    component={RouterLink} 
                                    to="/recommendations"
                                    startIcon={<RecommendIcon />}
                                >
                                    Recommendations
                                </Button>
                                <Button 
                                    color="inherit" 
                                    component={RouterLink} 
                                    to="/preferences"
                                    startIcon={<SettingsIcon />}
                                >
                                    Preferences
                                </Button>
                            </Box>

                            <IconButton color="inherit" onClick={handleThemeToggle}>
                                {darkMode ? <Brightness7 /> : <Brightness4 />}
                            </IconButton>

                            <IconButton
                                color="inherit"
                                onClick={handleProfileMenuOpen}
                            >
                                <AccountCircle />
                            </IconButton>
                        </Toolbar>
                    </AppBar>

                    <Box
                        component="nav"
                        sx={{ width: { sm: 240 }, flexShrink: { sm: 0 } }}
                    >
                        <Drawer
                            variant="temporary"
                            open={mobileOpen}
                            onClose={handleDrawerToggle}
                            ModalProps={{
                                keepMounted: true // Better mobile performance
                            }}
                            sx={{
                                display: { xs: 'block', sm: 'none' },
                                '& .MuiDrawer-paper': { 
                                    boxSizing: 'border-box',
                                    width: 240
                                }
                            }}
                        >
                            {drawer}
                        </Drawer>
                    </Box>

                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            p: 3,
                            width: { sm: `calc(100% - 240px)` }
                        }}
                    >
                        <Toolbar /> {/* Spacing for fixed AppBar */}
                        <Container>
                            <Routes>
                                <Route 
                                    path="/search" 
                                    element={<Search />} 
                                />
                                <Route 
                                    path="/upload" 
                                    element={<Upload />} 
                                />
                                <Route 
                                    path="/recommendations" 
                                    element={
                                        <Recommendations 
                                            userPreferences={userPreferences}
                                        />
                                    } 
                                />
                                <Route 
                                    path="/preferences" 
                                    element={
                                        <UserPreferences 
                                            userPreferences={userPreferences}
                                            onPreferencesUpdate={handlePreferencesUpdate}
                                        />
                                    } 
                                />
                                <Route 
                                    path="/resources/:id" 
                                    element={<ResourceDetail />} 
                                />
                                <Route 
                                    path="/" 
                                    element={
                                        <Box sx={{ mt: 4 }}>
                                            <Typography variant="h4" gutterBottom>
                                                Welcome to EduGuide
                                            </Typography>
                                            <Typography variant="body1">
                                                Your personalized educational resource platform.
                                            </Typography>
                                        </Box>
                                    } 
                                />
                            </Routes>
                        </Container>
                    </Box>

                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleProfileMenuClose}
                    >
                        <MenuItem onClick={handleProfileMenuClose}>Profile</MenuItem>
                        <MenuItem onClick={handleProfileMenuClose}>Settings</MenuItem>
                        <Divider />
                        <MenuItem onClick={handleProfileMenuClose}>Logout</MenuItem>
                    </Menu>
                </Box>
            </Router>
        </ThemeProvider>
    );
};

export default App;
