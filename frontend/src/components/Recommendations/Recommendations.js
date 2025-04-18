import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Skeleton,
    Chip,
    Rating,
    Alert,
    IconButton,
    Tooltip,
    Box
} from '@mui/material';
import { Info as InfoIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { sendAuditLog } from '../../utils/audit';

const Recommendations = ({ resourceId, userPreferences }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [explanations, setExplanations] = useState({});

    // Fetch recommendations on component mount and when resourceId changes
    useEffect(() => {
        if (resourceId) {
            fetchRecommendations();
            sendAuditLog({
                action: 'view_recommendations',
                metadata: { resourceId, userPreferences }
            });
        }
    }, [resourceId]);

    const fetchRecommendations = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/recommendations`, {
                params: {
                    resourceId,
                    ...userPreferences
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            setRecommendations(response.data.recommendations);
            setExplanations(response.data.explanations || {});
            setError(null);
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
            setError('Failed to load recommendations. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchRecommendations();
        sendAuditLog({
            action: 'refresh_recommendations',
            metadata: { resourceId, userPreferences }
        });
    };

    const renderSkeleton = () => (
        <Grid container spacing={3}>
            {[1, 2, 3].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item}>
                    <Card>
                        <CardContent>
                            <Skeleton variant="text" height={32} />
                            <Skeleton variant="text" />
                            <Skeleton variant="text" width="60%" />
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    const renderRecommendationCard = (recommendation) => {
        const explanation = explanations[recommendation._id];

        return (
            <Grid item xs={12} sm={6} md={4} key={recommendation._id}>
                <Card 
                    elevation={3}
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s',
                        '&:hover': {
                            transform: 'translateY(-4px)'
                        }
                    }}
                >
                    <CardContent sx={{ flexGrow: 1 }}>
                        <Box display="flex" alignItems="center" mb={1}>
                            <PictureAsPdfIcon color="error" sx={{ mr: 1 }} />
                            <Typography variant="h6" gutterBottom sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
                                {recommendation.title}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {recommendation.subject} - Grade {recommendation.grade}
                        </Typography>
                        <div style={{ marginBottom: 8 }}>
                            <Rating 
                                value={recommendation.matchScore * 5}
                                readOnly
                                precision={0.5}
                                size="small"
                            />
                            <Typography variant="caption" color="text.secondary">
                                {(recommendation.matchScore * 100).toFixed(0)}% match
                            </Typography>
                        </div>
                        {recommendation.keywords?.length > 0 && (
                            <Box mt={1}>
                                {recommendation.keywords.slice(0, 3).map((keyword, index) => (
                                    <Chip
                                        key={index}
                                        label={keyword}
                                        size="small"
                                        sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                ))}
                            </Box>
                        )}
                        {explanation && (
                            <Tooltip title={explanation}>
                                <IconButton size="small" sx={{ ml: 'auto' }}>
                                    <InfoIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </CardContent>
                    <CardActions>
                        <Button 
                            size="small" 
                            color="primary"
                            component={Link}
                            to={`/resources/${recommendation._id}`}
                            startIcon={<PictureAsPdfIcon />}
                        >
                            View Resource
                        </Button>
                    </CardActions>
                </Card>
            </Grid>
        );
    };

    return (
        <Container sx={{ py: 4 }}>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Grid item xs>
                    <Typography variant="h5" component="h2">
                        Recommended for You
                    </Typography>
                </Grid>
                <Grid item>
                    <Tooltip title="Refresh recommendations">
                        <IconButton onClick={handleRefresh} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Grid>
            </Grid>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                renderSkeleton()
            ) : recommendations.length > 0 ? (
                <Grid container spacing={3}>
                    {recommendations.map(renderRecommendationCard)}
                </Grid>
            ) : (
                <Typography variant="body1" color="text.secondary" align="center">
                    No recommendations available at this time.
                </Typography>
            )}
        </Container>
    );
};

export default Recommendations;