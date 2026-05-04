import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  VStack,
  Input,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Center
} from '@chakra-ui/react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // --- Handle QR Scan ---
  // --- Handle QR Scan ---
  const handleScan = async (scannedText: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrHash: scannedText }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: `Welcome, ${data.user.name}`, status: "success", duration: 2000 });
        
        // 1. Save user details to browser memory
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userName', data.user.name);
        localStorage.setItem('userId', data.user._id);

        // 2. Redirect to the correct dashboard based on their role
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
    } catch (error) {
      toast({ title: "Network error", status: "error", duration: 3000 });
    }
  };

  // --- Handle Standard Login (For future implementation) ---
  const handlePasswordLogin = () => {
    setLoading(true);
    // Placeholder for standard login logic
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Use QR Code for MVP", status: "info", duration: 3000 });
    }, 1000);
  };

  return (
    <Center minH="100vh" bg="#f0f4f8">
      <Box bg="white" p={8} borderRadius="xl" boxShadow="lg" w="100%" maxW="400px">
        <VStack spacing={2} mb={6} textAlign="center">
          <Heading size="lg">Personnel Availability System</Heading>
          <Text color="gray.500" fontSize="sm">College of Computing and Information Sciences</Text>
        </VStack>

        <Tabs variant="soft-rounded" colorScheme="blue" isFitted>
          <TabList mb={4} bg="gray.100" p={1} borderRadius="full">
            <Tab borderRadius="full">Login</Tab>
            <Tab borderRadius="full">QR Code</Tab>
          </TabList>

          <TabPanels>
            {/* Password Tab */}
            <TabPanel px={0}>
              <VStack spacing={4}>
                <Box w="100%">
                  <Text mb={1} fontSize="sm" fontWeight="bold">Email Address</Text>
                  <Input 
                    placeholder="user@ccis.edu" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Box>
                <Box w="100%">
                  <Text mb={1} fontSize="sm" fontWeight="bold">Password</Text>
                  <Input 
                    type="password" 
                    placeholder="Enter your password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Box>
                <Button w="100%" colorScheme="blackAlpha" bg="black" isLoading={loading} onClick={handlePasswordLogin}>
                  Sign In
                </Button>
              </VStack>
            </TabPanel>

            {/* QR Code Scanner Tab */}
            <TabPanel px={0}>
              <Box borderRadius="lg" overflow="hidden" borderWidth="1px">
                <Scanner 
  onScan={(result) => {
    // The new version returns an array of detected codes. 
    // We just grab the text (rawValue) from the first one it sees.
    if (result && result.length > 0) {
      handleScan(result[0].rawValue);
    }
  }} 
  onError={(error) => console.log(error)} 
/>
              </Box>
              <Text textAlign="center" mt={3} fontSize="sm" color="gray.500">
                Position your QR code inside the frame to log in.
              </Text>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Demo Accounts Box */}
        <Box mt={6} p={4} bg="blue.50" borderRadius="md" fontSize="sm" color="gray.600">
          <Text fontWeight="bold" mb={2}>Demo Accounts:</Text>
          <Text>Faculty: faculty@ccis.edu / faculty123</Text>
          <Text>Admin: admin@ccis.edu / admin123</Text>
        </Box>
      </Box>
    </Center>
  );
}