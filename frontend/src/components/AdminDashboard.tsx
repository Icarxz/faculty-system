import React, { useState, useEffect } from 'react';
import { 
  Box, Heading, Text, Button, VStack, Input, FormControl, FormLabel, 
  useToast, Select, HStack, Flex, Divider, Table, Thead, Tbody, Tr, Th, Td, Badge, useColorMode, useColorModeValue,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, useDisclosure // NEW IMPORTS
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

// HELPER: Convert military time (14:00) to standard time (2:00 PM)
export const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  const h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const standardHour = h % 12 || 12;
  return `${standardHour}:${minute} ${ampm}`;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const userName = localStorage.getItem('userName');
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure(); // Modal controls for QR

  const [activeView, setActiveView] = useState('home');
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [role, setRole] = useState('FACULTY'); 
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedQr, setSelectedQr] = useState({ hash: '', name: '' }); // State for viewing existing QR

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [programPosition, setProgramPosition] = useState('');
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedQr, setGeneratedQr] = useState('');
  const [newFacultyName, setNewFacultyName] = useState('');

  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [subject, setSubject] = useState('');
  const [schedRoom, setSchedRoom] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('1'); 
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const mainBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.900', 'white');
  const mutedText = useColorModeValue('gray.500', 'gray.400');
  const sidebarBg = useColorModeValue('black', 'gray.900');

  const fetchAllData = () => {
    fetch('http://localhost:5000/api/faculty/status').then(res => res.json()).then(data => setFacultyList(data));
    fetch('http://localhost:5000/api/faculty/appointments/all').then(res => res.json()).then(data => setAppointments(data));
    fetch('http://localhost:5000/api/faculty/users/all').then(res => res.json()).then(data => setAllUsers(data));
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setGeneratedQr('');
    try {
      const response = await fetch('http://localhost:5000/api/faculty/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, programPosition, room, role })
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: data.message, status: 'success' });
        setGeneratedQr(data.qrHash); setNewFacultyName(data.facultyName);
        setName(''); setEmail(''); setProgramPosition(''); setRoom('');
        fetchAllData();
      } else { toast({ title: data.error, status: 'error' }); }
    } catch (error) { }
    setLoading(false);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/faculty/schedule/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facultyId: selectedFacultyId, subject, room: schedRoom, dayOfWeek: Number(dayOfWeek), startTime, endTime })
      });
      if (response.ok) {
        toast({ title: 'Schedule Added Successfully!', status: 'success' });
        setSubject(''); setSchedRoom(''); setStartTime(''); setEndTime('');
      }
    } catch (err) { toast({ title: 'Error adding schedule', status: 'error' }); }
  };

  // --- SMART APPROVAL ENGINE FOR ADMIN ---
  const updateAppointmentStatus = async (targetApt: any, newStatus: string) => {
    if (newStatus === 'APPROVED') {
      
      // CRITICAL DIFFERENCE FROM FACULTY: The Admin sees EVERYONE. 
      // We must filter by Date AND by the specific Faculty ID!
      const approvedThatDay = appointments.filter(
        a => a.status === 'APPROVED' && 
             a.date === targetApt.date && 
             a.facultyId?._id === targetApt.facultyId?._id
      );

      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours * 60) + minutes;
      };

      const targetMinutes = timeToMinutes(targetApt.time);

      for (let existingApt of approvedThatDay) {
        const existingMinutes = timeToMinutes(existingApt.time);
        const timeDifference = Math.abs(targetMinutes - existingMinutes);

        if (timeDifference === 0) {
          toast({ title: "Overlap Blocked", description: `This faculty already has an appointment at this exact time!`, status: "error", duration: 5000 });
          return; // Blocks the approval
        }

        if (timeDifference <= 60) {
          const isConfirmed = window.confirm(`WARNING: This is only ${timeDifference} minutes away from another approved meeting for this faculty. Proceed?`);
          if (!isConfirmed) return; 
        }
      }
    }

    try {
      const response = await fetch(`http://localhost:5000/api/faculty/appointment/${targetApt._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast({ title: `Appointment ${newStatus}`, status: 'success' });
        fetchAllData();
      }
    } catch (error) {}
  };

  const renderSidebar = () => (
    <Box w="260px" bg={sidebarBg} color="white" p={6} display="flex" flexDir="column" h="100vh" position="sticky" top="0" borderRightWidth="1px" borderColor={borderColor}>
      <Heading size="md" mb={8} color="white" letterSpacing="tight">Admin Console</Heading>
      <VStack align="stretch" spacing={2} flex="1">
        <Button justifyContent="flex-start" variant={activeView === 'home' ? 'solid' : 'ghost'} colorScheme={activeView === 'home' ? 'blue' : 'whiteAlpha'} color={activeView === 'home' ? 'white' : 'gray.300'} onClick={() => setActiveView('home')}>Provisioning</Button>
        <Button justifyContent="flex-start" variant={activeView === 'faculty' ? 'solid' : 'ghost'} colorScheme={activeView === 'faculty' ? 'blue' : 'whiteAlpha'} color={activeView === 'faculty' ? 'white' : 'gray.300'} onClick={() => setActiveView('faculty')}>Roster Management</Button>
        <Button justifyContent="flex-start" variant={activeView === 'appointments' ? 'solid' : 'ghost'} colorScheme={activeView === 'appointments' ? 'blue' : 'whiteAlpha'} color={activeView === 'appointments' ? 'white' : 'gray.300'} onClick={() => setActiveView('appointments')}>Appointments ({appointments.filter(a => a.status === 'PENDING').length})</Button>
        <Button justifyContent="flex-start" variant={activeView === 'verification' ? 'solid' : 'ghost'} colorScheme={activeView === 'verification' ? 'blue' : 'whiteAlpha'} color={activeView === 'verification' ? 'white' : 'gray.300'} onClick={() => setActiveView('verification')}>Verification Queue</Button>
      </VStack>
      <VStack spacing={4} mt="auto">
        <Button w="100%" variant="outline" color="gray.300" borderColor="gray.600" _hover={{ color: 'white', borderColor: 'gray.400' }} onClick={toggleColorMode}>{colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}</Button>
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
            {activeView === 'home' && "System Provisioning"}
            {activeView === 'faculty' && "Faculty Roster & Live Status"}
            {activeView === 'appointments' && "Appointment Management"}
            {activeView === 'verification' && "Account Verification Queue"}
          </Heading>
          <Text color={mutedText} mt={1}>Welcome back, {userName}</Text>
        </Box>

        {activeView === 'home' && (
          {/* ... [Keep your existing 'home' view code here exactly as it is] ... */}
        )}

        {activeView === 'faculty' && (
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Table variant="simple" size="sm">
              <Thead><Tr><Th color={mutedText}>Name</Th><Th color={mutedText}>Position</Th><Th color={mutedText}>Live Status</Th><Th color={mutedText}>Authentication Key</Th></Tr></Thead>
              <Tbody>
                {facultyList.map(prof => (
                  <Tr key={prof._id}>
                    <Td fontWeight="bold" color={textColor}>{prof.name}</Td>
                    <Td color={textColor}>{prof.programPosition}</Td>
                    <Td><Badge colorScheme={prof.currentStatus === 'AVAILABLE' ? 'green' : 'gray'}>{prof.currentStatus}</Badge></Td>
                    <Td>
                      {/* NEW: Button to view existing QR Code */}
                      <Button size="xs" colorScheme="blue" variant="outline" onClick={() => { setSelectedQr({ hash: prof.qrHash, name: prof.name }); onOpen(); }}>
                        View QR
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {activeView === 'appointments' && (
          <Box bg={cardBg} p={6} borderRadius="lg" borderWidth="1px" borderColor={borderColor} shadow="sm">
            <Table variant="simple" size="sm">
              <Thead><Tr><Th color={mutedText}>Student</Th><Th color={mutedText}>Target Faculty</Th><Th color={mutedText}>Date/Time</Th><Th color={mutedText}>Reason</Th><Th color={mutedText}>Status</Th><Th color={mutedText}>Action</Th></Tr></Thead>
              <Tbody>
                {appointments.map(apt => (
                  <Tr key={apt._id}>
                    <Td fontWeight="bold" color={textColor}>{apt.studentName} ({apt.studentSection})</Td>
                    <Td color={textColor}>{apt.facultyId ? apt.facultyId.name : 'Unknown'}</Td>
                    {/* NEW: Time formatting applied here */}
                    <Td color={textColor}>{apt.date} {formatTime(apt.time)}</Td>
                    <Td maxW="200px" isTruncated color={textColor}>{apt.reason}</Td>
                    <Td><Badge colorScheme={apt.status === 'APPROVED' ? 'green' : apt.status === 'REJECTED' ? 'red' : 'yellow'}>{apt.status}</Badge></Td>
                    <Td>
                      {apt.status === 'PENDING' && (
                        <HStack spacing={2}>
                          {/* NEW: Passing the whole 'apt' object, not just ID */}
                          <Button size="xs" colorScheme="green" onClick={() => updateAppointmentStatus(apt, 'APPROVED')}>Approve</Button>
                          <Button size="xs" colorScheme="red" onClick={() => updateAppointmentStatus(apt, 'REJECTED')}>Reject</Button>
                        </HStack>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      {/* NEW: Reusable Modal to display existing QR Codes */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">Hardware Key for {selectedQr.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDirection="column" alignItems="center" pb={8}>
            <Box p={4} bg="white" borderWidth="2px" borderRadius="lg" mb={4}>
              <QRCodeSVG value={selectedQr.hash} size={250} />
            </Box>
            <Button colorScheme="blue" onClick={() => window.print()}>Print QR Key</Button>
          </ModalBody>
        </ModalContent>
      </Modal>

    </Flex>
  );
}