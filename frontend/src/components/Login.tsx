import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, VStack, Input, Button, Tabs, TabList, TabPanels, Tab, TabPanel,
  useToast, Center, useColorModeValue
} from '@chakra-ui/react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // FIX: Synced Theme Colors with the new Faculty Dashboard palette
  const bg = useColorModeValue('#eef2f7', '#0c1421');
  const cardBg = useColorModeValue('#ffffff', '#111d30');
  const textColor = useColorModeValue('#0f2240', '#e8f0fe');
  const mutedText = useColorModeValue('#6b7fa0', '#7a93b0');
  const borderColor = useColorModeValue('#dde3ec', '#1e3048');

  const handleScan = async (scannedText: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrHash: scannedText }),
      });
      const data = await response.json();
      if (response.ok) {
        const welcomeMessage = data.user.role === 'FACULTY' 
          ? `Welcome, ${data.user.name}. Attendance recorded!` 
          : `Welcome, ${data.user.name}`;

        toast({ title: welcomeMessage, status: "success", duration: 3000, position: "top" });
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userId', data.user._id);

        switch (data.user.role) {
          case 'ADMIN': navigate('/admin-dashboard'); break;
          case 'DEAN': navigate('/dean-dashboard'); break;
          case 'FACULTY': navigate('/faculty-dashboard'); break;
          case 'STUDENT': navigate('/student-dashboard'); break;
          default: navigate('/'); 
        }
      } else {
        toast({ title: data.error, status: "error", duration: 3000 });
      }
    } catch (error) { toast({ title: "Network error", status: "error" }); }
  };

  const handlePasswordLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Use QR Code for MVP", status: "info", duration: 3000 });
    }, 1000);
  };

  return (
    <Center minH="100vh" bg={bg} p={4} fontFamily="'Segoe UI', system-ui, sans-serif">
      <Box bg={cardBg} p={8} borderRadius="lg" borderWidth="1px" borderColor={borderColor} w="100%" maxW="400px" shadow="sm">
        <VStack spacing={2} mb={8} textAlign="center">
          <Heading size="lg" color={textColor} letterSpacing="tight">Access Portal</Heading>
          <Text color={mutedText} fontSize="sm">College of Computing and Information Sciences</Text>
        </VStack>

        <Tabs variant="line" colorScheme="blue" isFitted isLazy>
          <TabList mb={6} borderColor={borderColor}>
            <Tab color={textColor} fontWeight="semibold">Password</Tab>
            <Tab color={textColor} fontWeight="semibold">QR Scanner</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0} pt={0}>
              <VStack spacing={5}>
                <Box w="100%">
                  <Text mb={2} fontSize="sm" fontWeight="bold" color={textColor}>Email Address</Text>
                  <Input placeholder="user@ccis.edu" value={email} onChange={(e) => setEmail(e.target.value)} focusBorderColor="blue.500" color={textColor} borderColor={borderColor} />
                </Box>
                <Box w="100%">
                  <Text mb={2} fontSize="sm" fontWeight="bold" color={textColor}>Password</Text>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} focusBorderColor="blue.500" color={textColor} borderColor={borderColor} />
                </Box>
                <Button w="100%" colorScheme="blue" bg="#2563eb" _hover={{ bg: '#1d4ed8' }} isLoading={loading} onClick={handlePasswordLogin}>
                  Sign In
                </Button>
              </VStack>
            </TabPanel>

            <TabPanel px={0} pt={0}>
              <Box borderRadius="md" overflow="hidden" borderWidth="1px" borderColor={borderColor} bg="#000">
                <Scanner onScan={(result) => { if (result && result.length > 0) handleScan(result[0].rawValue); }} />
              </Box>
              <Text textAlign="center" mt={4} fontSize="sm" color={mutedText}>
                Align QR code within the frame
              </Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Center>
  );
}