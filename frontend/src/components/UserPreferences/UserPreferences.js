import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Box,
    Autocomplete,
    TextField,
    Button,
    Chip,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Snackbar
} from '@mui/material';
import { sendAuditLog } from '../../utils/audit';

const UserPreferences = ({ userPreferences, onPreferencesUpdate }) => {
    const [subjects, setSubjects] = useState(userPreferences.subjects || []);
    const [grade, setGrade] = useState(userPreferences.grade || '');
    const [interests, setInterests] = useState(userPreferences.interests || []);
    const [success, setSuccess] = useState(false);
    const [showSnackbar, setShowSnackbar] = useState(false);

    const availableSubjects = ['maths', 'science', 'english', 'history', 'geography'];
    const grades = Array.from({ length: 12 }, (_, i) => i + 1);
    const availableInterests = [
        'programming', 'robotics', 'art', 'music', 'sports',
        'literature', 'environmental_science', 'creative_writing',
        'physics', 'chemistry', 'biology', 'astronomy'
    ];

    const handleSave = async () => {
        const updatedPreferences = {
            subjects,
            grade,
            interests
        };
        
        // Save to localStorage
        localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
        
        // Update parent component
        onPreferencesUpdate(updatedPreferences);
        
        sendAuditLog({
            action: 'update_preferences',
            metadata: updatedPreferences
        });
        
        setSuccess(true);
        setShowSnackbar(true);
        setTimeout(() => {
            setSuccess(false);
            setShowSnackbar(false);
        }, 3000);
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }} aria-label="User preferences form">
            <Typography variant="h6" gutterBottom>
                Learning Preferences
            </Typography>

            <Snackbar
                open={showSnackbar}
                autoHideDuration={3000}
                onClose={() => setShowSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                message="Preferences saved successfully!"
            />

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Preferences saved successfully!
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                <Autocomplete
                    multiple
                    value={subjects}
                    onChange={(_, newValue) => setSubjects(newValue)}
                    options={availableSubjects}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Preferred Subjects"
                            placeholder="Select subjects"
                            aria-label="Preferred Subjects"
                        />
                    )}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip
                                label={option.charAt(0).toUpperCase() + option.slice(1)}
                                {...getTagProps({ index })}
                                aria-label={`Subject: ${option}`}
                            />
                        ))
                    }
                    sx={{ minWidth: 200, flex: 1 }}
                />

                <FormControl sx={{ minWidth: 120, flex: 1 }}>
                    <InputLabel>Grade Level</InputLabel>
                    <Select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        label="Grade Level"
                        aria-label="Grade Level"
                    >
                        {grades.map((g) => (
                            <MenuItem key={g} value={g}>
                                Grade {g}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Autocomplete
                    multiple
                    value={interests}
                    onChange={(_, newValue) => setInterests(newValue)}
                    options={availableInterests}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Interests"
                            placeholder="Add interests"
                            aria-label="Interests"
                        />
                    )}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip
                                label={option.charAt(0).toUpperCase() + option.slice(1)}
                                {...getTagProps({ index })}
                                aria-label={`Interest: ${option}`}
                            />
                        ))
                    }
                    sx={{ minWidth: 200, flex: 1 }}
                />
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    aria-label="Save preferences"
                >
                    Save Preferences
                </Button>
            </Box>
        </Paper>
    );
};

export default UserPreferences;
