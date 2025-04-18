import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Chip,
  Box,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import axios from 'axios';
import { sendAuditLog } from '../../utils/audit';

const ResourceDetail = () => {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResource = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/documents/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setResource(response.data);
        setError(null);
        sendAuditLog({
          action: 'view_resource',
          metadata: { resourceId: id }
        });
      } catch (err) {
        setError('Failed to load resource details.');
      } finally {
        setLoading(false);
      }
    };
    fetchResource();
  }, [id]);

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!resource) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>No resource found.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <PictureAsPdfIcon color="error" sx={{ fontSize: 40, mr: 2 }} />
          <Typography variant="h5">{resource.title}</Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {resource.subject} - Grade {resource.grade} | {resource.type} | {resource.year}
        </Typography>
        <Box mb={2}>
          {resource.keywords && resource.keywords.map((kw, i) => (
            <Chip key={i} label={kw} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          File size: {resource.fileSize ? (resource.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Uploaded: {resource.createdAt ? new Date(resource.createdAt).toLocaleString() : 'N/A'}
        </Typography>
        <Box mt={3}>
          <Button
            variant="contained"
            color="primary"
            href={resource.storageUrl}
            target="_blank"
            startIcon={<PictureAsPdfIcon />}
          >
            View/Download PDF
          </Button>
          <Button
            variant="outlined"
            sx={{ ml: 2 }}
            component={Link}
            to="/"
          >
            Back to Search
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResourceDetail;
