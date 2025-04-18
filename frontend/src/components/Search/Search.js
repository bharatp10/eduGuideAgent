import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import axios from 'axios';
import {
    Container,
    TextField,
    Typography,
    Paper,
    Grid,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Box,
    Button,
    Pagination
} from '@mui/material';
import { Link } from 'react-router-dom';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { sendAuditLog } from '../../utils/audit';

const Search = () => {
    // State management
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [filters, setFilters] = useState({});
    const [activeFilters, setActiveFilters] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0
    });

    // Load available filters on component mount
    useEffect(() => {
        fetchFilters();
    }, []);

    // Fetch available filters
    const fetchFilters = async () => {
        try {
            const response = await axios.get('/api/search/filters', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setFilters(response.data);
        } catch (error) {
            console.error('Failed to fetch filters:', error);
            setError('Failed to load search filters');
        }
    };

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (searchQuery, searchFilters) => {
            if (!searchQuery) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const response = await axios.get('/api/search', {
                    params: {
                        q: searchQuery,
                        ...searchFilters,
                        page: pagination.page,
                        limit: pagination.limit
                    },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                setResults(response.data.results);
                setPagination({
                    ...pagination,
                    total: response.data.pagination.total
                });
                setError(null);
                sendAuditLog({
                    action: 'search',
                    metadata: { query: searchQuery, filters: searchFilters, page: pagination.page, limit: pagination.limit }
                });
            } catch (error) {
                console.error('Search failed:', error);
                setError('Search failed. Please try again.');
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300),
        [pagination.page, pagination.limit]
    );

    // Handle search input changes
    const handleSearchInput = (event) => {
        const value = event.target.value;
        setQuery(value);
        debouncedSearch(value, activeFilters);
    };

    // Handle filter changes
    const handleFilterChange = (filterType, value) => {
        const newFilters = {
            ...activeFilters,
            [filterType]: value
        };
        setActiveFilters(newFilters);
        debouncedSearch(query, newFilters);
    };

    // Pagination handlers
    const handlePageChange = (event, value) => {
        setPagination(prev => ({ ...prev, page: value }));
        debouncedSearch(query, activeFilters);
    };

    // Render filter section
    const renderFilters = () => (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            {filters.subjects && (
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <InputLabel>Subject</InputLabel>
                        <Select
                            value={activeFilters.subject || ''}
                            onChange={(e) => handleFilterChange('subject', e.target.value)}
                            label="Subject"
                        >
                            <MenuItem value="">All Subjects</MenuItem>
                            {filters.subjects.map(subject => (
                                <MenuItem key={subject._id} value={subject._id}>
                                    {subject._id} ({subject.count})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            )}
            
            {filters.types && (
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={activeFilters.type || ''}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            label="Type"
                        >
                            <MenuItem value="">All Types</MenuItem>
                            {filters.types.map(type => (
                                <MenuItem key={type._id} value={type._id}>
                                    {type._id} ({type.count})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            )}

            {filters.grades && (
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <InputLabel>Grade</InputLabel>
                        <Select
                            value={activeFilters.grade || ''}
                            onChange={(e) => handleFilterChange('grade', e.target.value)}
                            label="Grade"
                        >
                            <MenuItem value="">All Grades</MenuItem>
                            {filters.grades.map(grade => (
                                <MenuItem key={grade._id} value={grade._id}>
                                    Grade {grade._id} ({grade.count})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            )}
        </Grid>
    );

    // Render search results
    const renderResults = () => (
        <Grid container spacing={2}>
            {results.map((result) => (
                <Grid item xs={12} sm={6} md={4} key={result._id}>
                    <Paper
                        elevation={2}
                        sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                        component={Link}
                        to={`/resources/${result._id}`}
                        style={{ textDecoration: 'none' }}
                    >
                        <Box display="flex" alignItems="center" mb={1}>
                            <PictureAsPdfIcon color="error" sx={{ mr: 1 }} />
                            <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>{result.title}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            {result.subject} - Grade {result.grade}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Type: {result.type}
                        </Typography>
                        {result.keywords && (
                            <Box mt={1}>
                                {result.keywords.map((keyword, index) => (
                                    <Chip
                                        key={index}
                                        label={keyword}
                                        size="small"
                                        sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            ))}
        </Grid>
    );

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Search Educational Resources
            </Typography>

            <TextField
                fullWidth
                label="Search resources..."
                variant="outlined"
                value={query}
                onChange={handleSearchInput}
                sx={{ mb: 3 }}
                InputProps={{
                    endAdornment: loading && <CircularProgress size={24} />
                }}
            />

            {renderFilters()}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {results.length > 0 ? (
                renderResults()
            ) : (
                <Typography variant="body1" color="text.secondary" align="center">
                    {query ? 'No results found' : 'Start typing to search'}
                </Typography>
            )}

            {results.length > 0 && (
                <Box display="flex" justifyContent="center" mt={4}>
                    <Pagination
                        count={Math.ceil(pagination.total / pagination.limit)}
                        page={pagination.page}
                        onChange={handlePageChange}
                        color="primary"
                    />
                </Box>
            )}
        </Container>
    );
};

export default Search;