import React, { useState, useRef } from 'react';
import {
    Container,
    Typography,
    Paper,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    LinearProgress,
    Alert,
    Box,
    Chip,
    IconButton,
    Tooltip,
    Snackbar,
    Alert as MuiAlert
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    Delete as DeleteIcon,
    Help as HelpIcon,
    PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import axios from 'axios';
import { sendAuditLog } from '../../utils/audit';

const Upload = () => {
    const fileInputRef = useRef();
    const [file, setFile] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        grade: '',
        type: '',
        year: new Date().getFullYear()
    });
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [showSnackbar, setShowSnackbar] = useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const subjects = ['maths', 'science', 'english', 'history', 'geography'];
    const types = ['textbook', 'question_paper', 'notes', 'worksheet'];
    const grades = Array.from({ length: 12 }, (_, i) => i + 1);

    const validateForm = () => {
        const errors = {};
        if (!formData.title.trim()) errors.title = 'Title is required';
        if (!formData.subject) errors.subject = 'Subject is required';
        if (!formData.grade) errors.grade = 'Grade is required';
        if (!formData.type) errors.type = 'Type is required';
        if (!file) errors.file = 'Please select a file to upload';
        if (file && file.size > 50 * 1024 * 1024) errors.file = 'File size must be less than 50MB';
        if (file && file.type !== 'application/pdf') errors.file = 'Only PDF files are allowed';

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleFileSelect = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                setError('Only PDF files are allowed');
                return;
            }
            if (selectedFile.size > 50 * 1024 * 1024) {
                setError('File size must be less than 50MB');
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear validation error when field is updated
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect({ target: { files: [droppedFile] } });
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);
        setSuccess(false);

        const formPayload = new FormData();
        formPayload.append('file', file);
        Object.keys(formData).forEach(key => {
            formPayload.append(key, formData[key]);
        });

        try {
            await axios.post('/api/documents/upload', formPayload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setProgress(percentCompleted);
                }
            });

            setSuccess(true);
            setShowSnackbar(true);
            resetForm();
            sendAuditLog({
                action: 'upload_document',
                metadata: { ...formData, fileName: file?.name, fileSize: file?.size }
            });
        } catch (error) {
            console.error('Upload failed:', error);
            setError(error.response?.data?.error || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setFormData({
            title: '',
            subject: '',
            grade: '',
            type: '',
            year: new Date().getFullYear()
        });
        setValidationErrors({});
        setError(null);
        setSuccess(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Upload Educational Resource
            </Typography>
            <Paper
                elevation={3}
                sx={{ p: isMobile ? 2 : 4, mb: 3 }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                aria-label="Upload form"
            >
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={2} direction="column">
                        <Grid item>
                            <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                flexDirection="column"
                                sx={{
                                    border: '2px dashed',
                                    borderColor: theme.palette.primary.main,
                                    borderRadius: 2,
                                    p: 3,
                                    mb: 2,
                                    background: file ? theme.palette.action.selected : 'inherit',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                tabIndex={0}
                                aria-label="File drop zone"
                            >
                                {file ? (
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <PictureAsPdfIcon color="error" />
                                        <Typography>{file.name}</Typography>
                                        <IconButton aria-label="Remove file" onClick={e => { e.stopPropagation(); setFile(null); }}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <>
                                        <UploadIcon fontSize="large" color="primary" />
                                        <Typography variant="body2" color="text.secondary">
                                            Drag & drop a PDF here, or click to select
                                        </Typography>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                    aria-label="Select PDF file"
                                />
                            </Box>
                            {validationErrors.file && <Alert severity="error">{validationErrors.file}</Alert>}
                        </Grid>
                        <Grid item>
                            <TextField
                                fullWidth
                                label="Title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                error={!!validationErrors.title}
                                helperText={validationErrors.title}
                                aria-label="Resource title"
                            />
                        </Grid>
                        <Grid item>
                            <FormControl fullWidth error={!!validationErrors.subject}>
                                <InputLabel>Subject</InputLabel>
                                <Select
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    label="Subject"
                                    aria-label="Subject"
                                >
                                    <MenuItem value="">Select subject</MenuItem>
                                    {subjects.map(subject => (
                                        <MenuItem key={subject} value={subject}>{subject.charAt(0).toUpperCase() + subject.slice(1)}</MenuItem>
                                    ))}
                                </Select>
                                {validationErrors.subject && <Typography color="error" variant="caption">{validationErrors.subject}</Typography>}
                            </FormControl>
                        </Grid>
                        <Grid item>
                            <FormControl fullWidth error={!!validationErrors.grade}>
                                <InputLabel>Grade</InputLabel>
                                <Select
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleInputChange}
                                    label="Grade"
                                    aria-label="Grade"
                                >
                                    <MenuItem value="">Select grade</MenuItem>
                                    {grades.map(grade => (
                                        <MenuItem key={grade} value={grade}>Grade {grade}</MenuItem>
                                    ))}
                                </Select>
                                {validationErrors.grade && <Typography color="error" variant="caption">{validationErrors.grade}</Typography>}
                            </FormControl>
                        </Grid>
                        <Grid item>
                            <FormControl fullWidth error={!!validationErrors.type}>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    label="Type"
                                    aria-label="Type"
                                >
                                    <MenuItem value="">Select type</MenuItem>
                                    {types.map(type => (
                                        <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}</MenuItem>
                                    ))}
                                </Select>
                                {validationErrors.type && <Typography color="error" variant="caption">{validationErrors.type}</Typography>}
                            </FormControl>
                        </Grid>
                        <Grid item>
                            <TextField
                                fullWidth
                                label="Year"
                                name="year"
                                type="number"
                                value={formData.year}
                                onChange={handleInputChange}
                                inputProps={{ min: 1900, max: new Date().getFullYear() }}
                                aria-label="Year"
                            />
                        </Grid>
                        <Grid item>
                            <Box display="flex" gap={2}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={uploading}
                                    aria-label="Upload"
                                >
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outlined"
                                    color="secondary"
                                    onClick={resetForm}
                                    disabled={uploading}
                                    aria-label="Reset form"
                                >
                                    Clear
                                </Button>
                            </Box>
                        </Grid>
                        {uploading && (
                            <Grid item>
                                <LinearProgress variant="determinate" value={progress} />
                            </Grid>
                        )}
                        {error && (
                            <Grid item>
                                <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
                            </Grid>
                        )}
                        {success && (
                            <Grid item>
                                <Alert severity="success" onClose={() => setSuccess(false)}>
                                    File uploaded successfully!
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                </form>
            </Paper>
            <Snackbar
                open={showSnackbar}
                autoHideDuration={4000}
                onClose={() => setShowSnackbar(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <MuiAlert onClose={() => setShowSnackbar(false)} severity="success" sx={{ width: '100%' }}>
                    File uploaded successfully!
                </MuiAlert>
            </Snackbar>
        </Container>
    );
};

export default Upload;