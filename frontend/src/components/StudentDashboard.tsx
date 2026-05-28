import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Select, Input, VStack, HStack, useToast, FormControl, FormLabel, Textarea, Flex,
  useColorMode, useColorModeValue
} from '@chakra-ui/react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'green'; case 'IN_CLASS': return 'blue';
    case 'IN_MEETING': return 'yellow'; case 'ON_BREAK': return 'orange';
    case 'OUT_OF_OFFICE': return 'gray'; case 'ON_LEAVE': return 'purple'; case 'ABSENT': return 'red';
    default: return 'gray';
  }
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const userName = localStorage.getItem('userName') || 'Student';
  const { colorMode, toggleColorMode } = useColorMode();

  const [activeView, setActiveView] = useState('home');
  const [faculty, setFaculty] = useState<any[]>([]);
  const [studentSection, setStudentSection] = useState('BS INFO 3D');

  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [aptDate, setAptDate] = useState('');
  const [aptTime, setAptTime] = useState('');
  const [aptReason, setAptReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [myRequests, setMyRequests] = useState<any[]>([]); // NEW: To hold student's appointments

  // Universal Theme Hooks
  const mainBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.900', 'white');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const sidebarBg = useColorModeValue('black', 'gray.900');

  const fetchData = () => {
    // 1. Fetch Live Board
    fetch('http://localhost:5000/api/faculty/status')
      .then(res => res.json())
      .then(data => setFaculty(data));

    // 2. Fetch My Appointment Requests
    if (userName) {
      fetch(`http://localhost:5000/api/faculty/appointments/student/${userName}`)
        .then(res => res.json())
        .then(data => setMyRequests(data));
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const normalized = timeStr.replace(/-/g, ':');
    const parts = normalized.split(':');
    if (parts.length < 2) return normalized;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, '0');
    if (Number.isNaN(hours)) return normalized;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [userName]);

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/faculty/appointment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: userName, studentSection, facultyId: selectedFaculty, date: aptDate, time: aptTime, reason: aptReason })
      });
      if (response.ok) {
        toast({ title: 'Appointment Requested!', description: 'Check the My Requests tab for updates.', status: 'success' });
        setSelectedFaculty(''); setAptDate(''); setAptTime(''); setAptReason('');
        setActiveView('requests'); // Auto-switch to their requests tab!
        fetchData(); // Instantly refresh data
      }
    } catch (error) { toast({ title: 'Error sending request.', status: 'error' }); }
    setIsSubmitting(false);
  };

  // --- NEW: Cancel Appointment UX ---
  const handleCancelAppointment = async (id: string) => {
    try {
      // We reuse the update route to mark it as cancelled
      const response = await fetch(`http://localhost:5000/api/faculty/appointment/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED BY STUDENT' })
      });
      if (response.ok) {
        toast({ title: `Appointment Cancelled`, status: 'info' });
        fetchData();
      }
    } catch (error) {}
  };

  const renderSidebar = () => (
    <Box w="260px" bg={sidebarBg} color="white" p={6} display="flex" flexDir="column" h="100vh" position="sticky" top="0" borderRightWidth="1px" borderColor={borderColor}>
      <Heading size="md" mb={8} color="white" letterSpacing="tight">Student Portal</Heading>
      <VStack align="stretch" spacing={2} flex="1">
        <Button justifyContent="flex-start" variant={activeView === 'home' ? 'solid' : 'ghost'} colorScheme={activeView === 'home' ? 'blue' : 'whiteAlpha'} color={activeView === 'home' ? 'white' : 'gray.300'} onClick={() => setActiveView('home')}>Live Availability</Button>
        <Button justifyContent="flex-start" variant={activeView === 'appointments' ? 'solid' : 'ghost'} colorScheme={activeView === 'appointments' ? 'blue' : 'whiteAlpha'} color={activeView === 'appointments' ? 'white' : 'gray.300'} onClick={() => setActiveView('appointments')}>Book Consultation</Button>
        <Button justifyContent="flex-start" variant={activeView === 'requests' ? 'solid' : 'ghost'} colorScheme={activeView === 'requests' ? 'blue' : 'whiteAlpha'} color={activeView === 'requests' ? 'white' : 'gray.300'} onClick={() => setActiveView('requests')}>My Requests</Button>
      </VStack>
      <VStack spacing={4} mt="auto">
        <Button w="100%" variant="outline" color="gray.300" borderColor="gray.600" _hover={{ color: 'white', borderColor: 'gray.400' }} onClick={toggleColorMode}>
          {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
        </Button>
        <Button w="100%" colorScheme="red" variant="solid" onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</Button>
      </VStack>
    </Box>
  );

  return (
    <Flex minH="100vh" bg={mainBg}>
      {renderSidebar()}
      <Box flex="1" p={10} overflowY="auto">
        <Box mb={8}>
          <Heading size="lg" color={textColor} letterSpacing="tight">
            {activeView === 'home' && "Faculty status"}
            {activeView === 'appointments' && "Schedule an appointment"}
            {activeView === 'requests' && "My appointment requests"}
          </Heading>
          <Text color={mutedText} mt={1}>Welcome, {userName}</Text>
        </Box>

        {activeView === 'home' && (
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <TableContainer>
              <Table variant="simple" size="md">
                <Thead><Tr><Th color={mutedText}>Faculty Name</Th><Th color={mutedText}>Live Status & Location</Th><Th color={mutedText}>Announcements / Notices</Th></Tr></Thead>
                <Tbody>
                  {faculty.map((prof) => {
                    const isMissing = prof.currentStatus === 'ABSENT' || prof.currentStatus === 'ON_LEAVE';
                    return (
                      <Tr key={prof._id}>
                        <Td fontWeight="bold" color={textColor}>
                          <Text>{prof.name}</Text>
                          <Text fontSize="xs" color={mutedText} fontWeight="normal">{prof.programPosition}</Text>
                        </Td>
                        <Td>
                          <HStack>
                            <Badge colorScheme={getStatusColor(prof.currentStatus)} px={3} py={1} borderRadius="full">{prof.currentStatus.replace(/_/g, ' ')}</Badge>
                            <Text color={isMissing ? 'red.500' : textColor} fontWeight={isMissing ? 'bold' : 'normal'} fontSize="sm">
                              {isMissing ? 'Not on Campus' : (prof.currentLocation || prof.room || 'N/A')}
                            </Text>
                          </HStack>
                        </Td>
                        <Td maxW="300px">
                          <VStack align="start" spacing={1}>
                            {prof.noticeMessage && <Badge colorScheme="blue" textTransform="none" whiteSpace="normal" p={2} borderRadius="md">📢 {prof.noticeMessage}</Badge>}
                            {prof.flaggedDate && <Badge colorScheme="orange" textTransform="none" p={2} borderRadius="md">🗓️ Out on {prof.flaggedDate} {prof.flaggedReason ? `(${prof.flaggedReason})` : ''}</Badge>}
                            {!prof.noticeMessage && !prof.flaggedDate && <Text color={mutedText} fontSize="sm">No current notices</Text>}
                          </VStack>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {activeView === 'appointments' && (
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm" maxW="600px">
            <form onSubmit={handleAppointmentSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired><FormLabel color={textColor}>Your Section</FormLabel><Input value={studentSection} onChange={(e) => setStudentSection(e.target.value)} placeholder="e.g. BS INFO 3D" color={textColor} /></FormControl>
                <FormControl isRequired><FormLabel color={textColor}>Select Professor</FormLabel>
                  <Select placeholder="Choose..." value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)} color={textColor}>
                    {faculty.map(f => (
                      <option key={f._id} value={f._id} disabled={f.currentStatus === 'ABSENT' || f.currentStatus === 'ON_LEAVE'}>
                        {f.name} {f.currentStatus === 'ABSENT' || f.currentStatus === 'ON_LEAVE' ? '(Unavailable)' : ''}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <HStack w="100%">
                  <FormControl isRequired><FormLabel color={textColor}>Date</FormLabel><Input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)} color={textColor}/></FormControl>
                  <FormControl isRequired><FormLabel color={textColor}>Time</FormLabel><Input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)} color={textColor}/></FormControl>
                </HStack>
                <FormControl isRequired><FormLabel color={textColor}>Purpose of Meeting</FormLabel>
                  <Textarea placeholder="e.g., Thesis consultation, Grade inquiry..." value={aptReason} onChange={(e) => setAptReason(e.target.value)} color={textColor} />
                </FormControl>
                <Button type="submit" colorScheme="blue" w="100%" isLoading={isSubmitting} size="lg">Submit Appointment Request</Button>
              </VStack>
            </form>
          </Box>
        )}

        {/* --- NEW: MY REQUESTS VIEW --- */}
        {activeView === 'requests' && (
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead><Tr><Th color={mutedText}>Professor</Th><Th color={mutedText}>Date/Time</Th><Th color={mutedText}>Reason</Th><Th color={mutedText}>Status</Th><Th color={mutedText}>Action</Th></Tr></Thead>
                <Tbody>
                  {myRequests.map(apt => (
                    <Tr key={apt._id}>
                      <Td fontWeight="bold" color={textColor}>{apt.facultyId ? apt.facultyId.name : 'Unknown'}</Td>
                      <Td color={textColor}>{apt.date} {formatTime(apt.time)}</Td>
                      <Td maxW="200px" isTruncated color={textColor}>{apt.reason}</Td>
                      <Td>
                        <Badge 
                          colorScheme={apt.status === 'APPROVED' ? 'green' : apt.status === 'REJECTED' ? 'red' : apt.status === 'PENDING' ? 'yellow' : 'gray'} 
                          px={2} py={1} borderRadius="md"
                        >
                          {apt.status}
                        </Badge>
                      </Td>
                      <Td>
                        {apt.status === 'PENDING' && (
                          <Button size="xs" colorScheme="gray" variant="outline" onClick={() => handleCancelAppointment(apt._id)}>
                            Cancel Request
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                  {myRequests.length === 0 && <Tr><Td colSpan={5} textAlign="center" py={10} color={mutedText}>You have no appointment requests.</Td></Tr>}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </Flex>
  );
}