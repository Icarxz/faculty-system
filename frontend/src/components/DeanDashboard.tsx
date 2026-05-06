import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Input, SimpleGrid, Stat, StatLabel, StatNumber, HStack, Flex, VStack, CircularProgress, CircularProgressLabel, Divider
} from '@chakra-ui/react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'green'; case 'IN_CLASS': return 'blue';
    case 'IN_MEETING': return 'yellow'; case 'ON_BREAK': return 'orange';
    case 'OUT_OF_OFFICE': return 'gray'; case 'ON_LEAVE': return 'purple'; case 'ABSENT': return 'red';
    default: return 'gray';
  }
};

export default function DeanDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');
  
  const [activeView, setActiveView] = useState('analytics');
  const [faculty, setFaculty] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const fetchStatus = () => {
    fetch('http://localhost:5000/api/faculty/status')
      .then((res) => res.json())
      .then((data) => setFaculty(data));
  };

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const totalFaculty = faculty.length;
  const availableCount = faculty.filter(f => f.currentStatus === 'AVAILABLE').length;
  const inClassCount = faculty.filter(f => f.currentStatus === 'IN_CLASS').length;
  const absentCount = faculty.filter(f => f.currentStatus === 'ABSENT' || f.currentStatus === 'ON_LEAVE').length;

  const flaggedFaculty = faculty.filter(f => f.currentStatus === 'ABSENT' || f.currentStatus === 'ON_LEAVE' || f.currentStatus === 'OUT_OF_OFFICE');

  const generateReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,Faculty Name,Program / Position,Live Status,Current Location\n";
    faculty.forEach(prof => {
      const name = prof.name.replace(/,/g, ''); 
      const program = prof.programPosition.replace(/,/g, '');
      const status = prof.currentStatus.replace(/_/g, ' ');
      const location = (prof.currentLocation || prof.room || 'N/A').replace(/,/g, '');
      csvContent += `${name},${program},${status},${location}\n`;
    });
    csvContent += `\nANALYTICS SUMMARY\nTotal Personnel,${totalFaculty}\nCurrently Available,${availableCount}\nIn Classrooms,${inClassCount}\nAbsent/On Leave,${absentCount}\nGenerated On,${new Date().toLocaleString()}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dean_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
  };

  const renderSidebar = () => (
    <Box w="250px" bg="#5E766C" color="white" p={6} display="flex" flexDir="column" h="100vh" position="sticky" top="0">
      <Heading size="md" mb={8}>Dean's Office</Heading>
      <VStack align="stretch" spacing={2} flex="1">
        <Button justifyContent="flex-start" variant={activeView === 'analytics' ? 'solid' : 'ghost'} colorScheme={activeView === 'analytics' ? 'green' : 'whiteAlpha'} onClick={() => setActiveView('analytics')}>Health & Analytics</Button>
        <Button justifyContent="flex-start" variant={activeView === 'faculty' ? 'solid' : 'ghost'} colorScheme={activeView === 'faculty' ? 'green' : 'whiteAlpha'} onClick={() => setActiveView('faculty')}>Flagged Personnel</Button>
        <Button justifyContent="flex-start" variant={activeView === 'export' ? 'solid' : 'ghost'} colorScheme={activeView === 'export' ? 'green' : 'whiteAlpha'} onClick={() => setActiveView('export')}>Data Export</Button>
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
            {activeView === 'analytics' && "Department Health & Compliance"}
            {activeView === 'faculty' && "Personnel Review Queue"}
            {activeView === 'export' && "Report Generation"}
          </Heading>
          <Text color="gray.500">Welcome, {userName}</Text>
        </Box>

        {/* --- VIEW: ANALYTICS --- */}
        {activeView === 'analytics' && (
          <Box>
            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
              <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor="purple.400"><Stat><StatLabel>Total Personnel</StatLabel><StatNumber>{totalFaculty}</StatNumber></Stat></Box>
              <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor="green.400"><Stat><StatLabel>Currently Available</StatLabel><StatNumber color="green.500">{availableCount}</StatNumber></Stat></Box>
              <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor="blue.400"><Stat><StatLabel>In Classrooms</StatLabel><StatNumber color="blue.500">{inClassCount}</StatNumber></Stat></Box>
              <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor="red.400"><Stat><StatLabel>Absent / On Leave</StatLabel><StatNumber color="red.500">{absentCount}</StatNumber></Stat></Box>
            </SimpleGrid>

            <Box display="flex" gap={6} flexDir={{ base: 'column', md: 'row' }}>
              <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" flex="1" textAlign="center">
                <Heading size="md" mb={4}>System Compliance</Heading>
                <CircularProgress value={88} color="green.400" size="120px" thickness="12px">
                  <CircularProgressLabel>88%</CircularProgressLabel>
                </CircularProgress>
                <Text mt={4} color="gray.600" fontSize="sm">Faculty updating status on time (Simulated)</Text>
              </Box>
              <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" flex="2">
                 <Heading size="md" mb={4}>Department Overview</Heading>
                 <Text color="gray.600">The attendance health remains stable. Currently, {inClassCount} instructors are conducting classes. Action is only required for the {absentCount} individuals flagged for absence or leave.</Text>
              </Box>
            </Box>
          </Box>
        )}

        {/* --- VIEW: FLAGGED FACULTY --- */}
        {activeView === 'faculty' && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
            <Heading size="md" mb={4} color="red.600">Action Required: Flagged Absences</Heading>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead bg="gray.50"><Tr><Th>Name</Th><Th>Position</Th><Th>Current Status</Th><Th>Action</Th></Tr></Thead>
                <Tbody>
                  {flaggedFaculty.map((prof) => (
                    <Tr key={prof._id} bg="red.50">
                      <Td fontWeight="bold">{prof.name}</Td>
                      <Td>{prof.programPosition}</Td>
                      <Td><Badge colorScheme="red">{prof.currentStatus.replace(/_/g, ' ')}</Badge></Td>
                      <Td><Button size="xs" colorScheme="red" variant="outline">Review Record</Button></Td>
                    </Tr>
                  ))}
                  {flaggedFaculty.length === 0 && <Tr><Td colSpan={4} textAlign="center">No faculty currently flagged.</Td></Tr>}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* --- VIEW: EXPORT --- */}
        {activeView === 'export' && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" maxW="600px">
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading size="md" mb={2}>Download Master Report</Heading>
                <Text fontSize="sm" color="gray.500" mb={4}>Export a CSV containing all current live statuses and analytics.</Text>
                <Button size="lg" colorScheme="green" bg="#5E766C" w="100%" onClick={generateReport}>Download CSV Report</Button>
              </Box>
              <Divider />
              <Box>
                <Heading size="md" mb={2}>Filtered Date Export (Prototype)</Heading>
                <HStack spacing={4} mb={4}>
                  <FormControl><FormLabel>Start Date</FormLabel><Input type="date" /></FormControl>
                  <FormControl><FormLabel>End Date</FormLabel><Input type="date" /></FormControl>
                </HStack>
                <Button w="100%" onClick={() => alert('Phase 2 Integration: Date querying requires backend log processing.')}>Generate PDF</Button>
              </Box>
            </VStack>
          </Box>
        )}

      </Box>
    </Flex>
  );
}