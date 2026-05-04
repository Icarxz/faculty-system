import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Select, Input, VStack, HStack, useToast, FormControl, FormLabel, Textarea, Flex
} from '@chakra-ui/react';

// Added new colors for Leave and Absent
const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'green'; 
    case 'IN_CLASS': return 'blue';
    case 'IN_MEETING': return 'yellow'; 
    case 'ON_BREAK': return 'orange';
    case 'OUT_OF_OFFICE': return 'gray'; 
    case 'ON_LEAVE': return 'purple'; 
    case 'ABSENT': return 'red';
    default: return 'gray';
  }
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const userName = localStorage.getItem('userName') || 'Student';

  // State for Sidebar
  const [activeView, setActiveView] = useState('home');

  const [faculty, setFaculty] = useState<any[]>([]);
  const [studentSection, setStudentSection] = useState('BS INFO 3D');

  // Appointment Form State
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [aptDate, setAptDate] = useState('');
  const [aptTime, setAptTime] = useState('');
  const [aptReason, setAptReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const fetchFaculty = () => {
    fetch('http://localhost:5000/api/faculty/status')
      .then(res => res.json())
      .then(data => setFaculty(data));
  };

  useEffect(() => {
    fetchFaculty();
    const intervalId = setInterval(fetchFaculty, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/faculty/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: userName,
          studentSection,
          facultyId: selectedFaculty,
          date: aptDate,
          time: aptTime,
          reason: aptReason
        })
      });

      if (response.ok) {
        toast({ title: 'Appointment Requested!', status: 'success' });
        setSelectedFaculty(''); setAptDate(''); setAptTime(''); setAptReason('');
        setActiveView('home'); // Send them back to the home board after booking
      }
    } catch (error) {
      toast({ title: 'Error sending request.', status: 'error' });
    }
    setIsSubmitting(false);
  };

  const renderSidebar = () => (
    <Box w="250px" bg="#5E766C" color="white" p={6} display="flex" flexDir="column" h="100vh" position="sticky" top="0">
      <Heading size="md" mb={8}>Student Portal</Heading>
      <VStack align="stretch" spacing={2} flex="1">
        <Button justifyContent="flex-start" variant={activeView === 'home' ? 'solid' : 'ghost'} colorScheme={activeView === 'home' ? 'green' : 'whiteAlpha'} onClick={() => setActiveView('home')}>
          Live Availability Board
        </Button>
        <Button justifyContent="flex-start" variant={activeView === 'appointments' ? 'solid' : 'ghost'} colorScheme={activeView === 'appointments' ? 'green' : 'whiteAlpha'} onClick={() => setActiveView('appointments')}>
          Request Appointment
        </Button>
      </VStack>
      <Button mt="auto" colorScheme="red" variant="solid" onClick={handleLogout}>Logout</Button>
    </Box>
  );

  return (
    <Flex minH="100vh" bg="#f7fafc">
      {renderSidebar()}

      <Box flex="1" p={8} overflowY="auto">
        <Box mb={8}>
          <Heading size="lg" color="gray.800">
            {activeView === 'home' && "Live Faculty Status"}
            {activeView === 'appointments' && "Schedule a Consultation"}
          </Heading>
          <Text color="gray.500">Welcome, {userName}</Text>
        </Box>

        {/* --- VIEW: HOME (Live Board) --- */}
        {activeView === 'home' && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
            <TableContainer>
              <Table variant="simple" size="md">
                <Thead bg="gray.50">
                  <Tr><Th>Faculty Name</Th><Th>Position</Th><Th>Live Status</Th><Th>Location</Th></Tr>
                </Thead>
                <Tbody>
                  {faculty.map((prof) => {
                    // Logic to highlight missing professors
                    const isMissing = prof.currentStatus === 'ABSENT' || prof.currentStatus === 'ON_LEAVE';
                    
                    return (
                      <Tr key={prof._id} bg={isMissing ? 'red.50' : 'transparent'} _hover={{ bg: isMissing ? 'red.100' : 'gray.50' }}>
                        <Td fontWeight="bold">
                          {prof.name}
                          {isMissing && <Badge ml={2} colorScheme="red" variant="outline">UNAVAILABLE</Badge>}
                        </Td>
                        <Td>{prof.programPosition}</Td>
                        <Td><Badge colorScheme={getStatusColor(prof.currentStatus)} px={3} py={1} borderRadius="full">{prof.currentStatus.replace(/_/g, ' ')}</Badge></Td>
                        <Td color={isMissing ? 'red.500' : 'inherit'} fontWeight={isMissing ? 'bold' : 'normal'}>
                          {isMissing ? 'Not on Campus' : (prof.currentLocation || prof.room || 'N/A')}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* --- VIEW: REQUEST APPOINTMENT --- */}
        {activeView === 'appointments' && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" maxW="600px">
            <form onSubmit={handleAppointmentSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Your Section</FormLabel>
                  <Input value={studentSection} onChange={(e) => setStudentSection(e.target.value)} placeholder="e.g. BS INFO 3D" />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Select Professor</FormLabel>
                  <Select placeholder="Choose..." value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)}>
                    {faculty.map(f => (
                       // Prevent students from trying to book absent professors
                      <option key={f._id} value={f._id} disabled={f.currentStatus === 'ABSENT' || f.currentStatus === 'ON_LEAVE'}>
                        {f.name} {f.currentStatus === 'ABSENT' || f.currentStatus === 'ON_LEAVE' ? '(Unavailable)' : ''}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <HStack w="100%">
                  <FormControl isRequired><FormLabel>Date</FormLabel><Input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)} /></FormControl>
                  <FormControl isRequired><FormLabel>Time</FormLabel><Input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)} /></FormControl>
                </HStack>

                <FormControl isRequired>
                  <FormLabel>Purpose of Meeting</FormLabel>
                  <Textarea placeholder="e.g., Thesis consultation, Grade inquiry..." value={aptReason} onChange={(e) => setAptReason(e.target.value)} />
                </FormControl>

                <Button type="submit" bg="#5E766C" color="white" _hover={{ bg: "#4a5d55" }} w="100%" isLoading={isSubmitting} size="lg">
                  Submit Appointment Request
                </Button>
              </VStack>
            </form>
          </Box>
        )}
      </Box>
    </Flex>
  );
}