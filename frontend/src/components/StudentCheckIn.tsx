import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Flex, Heading, Text, Button, VStack, useToast, useColorModeValue } from '@chakra-ui/react';

export default function StudentCheckIn() {
  const { token } = useParams(); 
  const navigate = useNavigate();
  const toast = useToast();
  
  // The finite state machine mapping exactly to your 3 required outcomes
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'EXPIRED' | 'DUPLICATE'>('IDLE');
  const [message, setMessage] = useState('');

  const bg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  // 1. The Bounce-Back Authentication Check
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId || userRole !== 'STUDENT') {
      // Preserve the token in session memory before kicking them out
      sessionStorage.setItem('intendedRoute', `/attend/${token}`);
      toast({
        title: 'Authentication Required',
        description: 'Please log in to confirm your attendance.',
        status: 'warning',
        duration: 4000,
        position: 'top'
      });
      navigate('/'); 
    }
  }, [navigate, token, toast]);

  // 2. The Authoritative Backend Call
  const handleConfirm = async () => {
    setStatus('LOADING');
    const userId = localStorage.getItem('userId');

    try {
      const response = await fetch('http://localhost:5000/api/faculty/attendance/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token, studentId: userId })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'SESSION_EXPIRED') {
          setStatus('EXPIRED');
          setMessage(data.error);
        } else {
          // Catch-all for invalid/tampered QR codes
          setStatus('EXPIRED'); 
          setMessage(data.error || 'Invalid or unrecognized QR code.');
        }
        return;
      }

      // 3. Render the specific successful states
      if (data.code === 'ALREADY_LOGGED') {
        setStatus('DUPLICATE');
        setMessage(data.message);
      } else {
        setStatus('SUCCESS');
        setMessage('You are marked present.');
      }

    } catch (error: any) {
      setStatus('IDLE');
      toast({ title: 'Connection Error', description: error.message, status: 'error', position: 'top' });
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} p={4}>
      <Box w="100%" maxW="400px" bg={cardBg} borderRadius="xl" shadow="2xl" p={8} textAlign="center">
        
        {/* DEFAULT STATE: Prevents race-conditions by requiring a physical tap */}
        {status === 'IDLE' && (
          <VStack spacing={6}>
            <Heading size="lg" color="blue.600">Class Attendance</Heading>
            <Text color="gray.500">Tap below to securely log your attendance for this session.</Text>
            <Button colorScheme="blue" size="lg" w="100%" onClick={handleConfirm}>
              Confirm Attendance
            </Button>
          </VStack>
        )}

        {status === 'LOADING' && (
          <VStack spacing={4}>
            <Button isLoading loadingText="Verifying with Server..." colorScheme="blue" variant="outline" w="100%" border="none" />
          </VStack>
        )}

        {/* OUTCOME 1: SUCCESS */}
        {status === 'SUCCESS' && (
          <VStack spacing={4}>
            <Heading size="md" color="green.500">Attendance Confirmed</Heading>
            <Text color="gray.500">{message}</Text>
            <Button colorScheme="green" variant="outline" w="100%" onClick={() => navigate('/student-dashboard')}>Return to Dashboard</Button>
          </VStack>
        )}

        {/* OUTCOME 2: ALREADY CHECKED IN */}
        {status === 'DUPLICATE' && (
          <VStack spacing={4}>
            <Heading size="md" color="blue.400">Already Logged</Heading>
            <Text color="gray.500">{message}</Text>
            <Button colorScheme="blue" variant="outline" w="100%" onClick={() => navigate('/student-dashboard')}>Return to Dashboard</Button>
          </VStack>
        )}

        {/* OUTCOME 3: EXPIRED OR INVALID */}
        {status === 'EXPIRED' && (
          <VStack spacing={4}>
            <Heading size="md" color="red.500">Session Ended</Heading>
            <Text color="gray.500">{message}</Text>
            <Button colorScheme="red" variant="outline" w="100%" onClick={() => navigate('/student-dashboard')}>Return to Dashboard</Button>
          </VStack>
        )}

      </Box>
    </Flex>
  );
}