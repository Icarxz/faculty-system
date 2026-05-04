import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Badge, Input, SimpleGrid, Stat, StatLabel, StatNumber, HStack
} from '@chakra-ui/react';

interface FacultyMember {
  _id: string;
  name: string;
  programPosition: string;
  currentStatus: string;
  currentLocation?: string;
  room: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'green';
    case 'IN_CLASS': return 'blue';
    case 'IN_MEETING': return 'yellow';
    case 'ON_BREAK': return 'orange';
    case 'OUT_OF_OFFICE': return 'gray';
    default: return 'gray';
  }
};

export default function DeanDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');
  
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const fetchStatus = () => {
    fetch('http://localhost:5000/api/faculty/status')
      .then((res) => res.json())
      .then((data) => setFaculty(data))
      .catch((error) => console.error("Error fetching data:", error));
  };

  useEffect(() => {
    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // --- Analytics Calculations ---
  const totalFaculty = faculty.length;
  const availableCount = faculty.filter(f => f.currentStatus === 'AVAILABLE').length;
  const inClassCount = faculty.filter(f => f.currentStatus === 'IN_CLASS').length;
  const outOfOfficeCount = faculty.filter(f => f.currentStatus === 'OUT_OF_OFFICE').length;

  const filteredFaculty = faculty.filter((prof) => 
    prof.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    prof.programPosition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // === NEW FEATURE: GENERATE OFFLINE CSV REPORT ===
  const generateReport = () => {
    // 1. Set up the CSV Headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Faculty Name,Program / Position,Live Status,Current Location\n";

    // 2. Loop through the faculty and add their data
    faculty.forEach(prof => {
      // We replace commas with spaces so it doesn't break the CSV columns
      const name = prof.name.replace(/,/g, ''); 
      const program = prof.programPosition.replace(/,/g, '');
      const status = prof.currentStatus.replace(/_/g, ' ');
      const location = (prof.currentLocation || prof.room || 'N/A').replace(/,/g, '');
      
      csvContent += `${name},${program},${status},${location}\n`;
    });

    // 3. Add the Analytics Summary at the bottom of the spreadsheet
    csvContent += "\n";
    csvContent += "ANALYTICS SUMMARY\n";
    csvContent += `Total Personnel,${totalFaculty}\n`;
    csvContent += `Currently Available,${availableCount}\n`;
    csvContent += `In Classrooms,${inClassCount}\n`;
    csvContent += `Out of Office,${outOfOfficeCount}\n`;
    csvContent += `Report Generated On,${new Date().toLocaleString()}\n`;

    // 4. Trigger the download automatically
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CCIS_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box p={8} maxW="1200px" mx="auto" bg="#f7fafc" minH="100vh">
      
      {/* Header */}
      <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" mb={6} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Heading size="lg" color="purple.600" mb={1}>Dean's Overview</Heading>
          <Text color="gray.500">Welcome, {userName} | Live Department Analytics</Text>
        </Box>
        <Button onClick={handleLogout} colorScheme="red" variant="outline">Logout</Button>
      </Box>

      {/* Analytics Cards */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor="purple.400">
          <Stat>
            <StatLabel color="gray.500">Total Personnel</StatLabel>
            <StatNumber fontSize="3xl">{totalFaculty}</StatNumber>
          </Stat>
        </Box>
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor="green.400">
          <Stat>
            <StatLabel color="gray.500">Currently Available</StatLabel>
            <StatNumber fontSize="3xl" color="green.500">{availableCount}</StatNumber>
          </Stat>
        </Box>
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor="blue.400">
          <Stat>
            <StatLabel color="gray.500">In Classrooms</StatLabel>
            <StatNumber fontSize="3xl" color="blue.500">{inClassCount}</StatNumber>
          </Stat>
        </Box>
        <Box bg="white" p={5} borderRadius="lg" boxShadow="sm" borderTop="4px solid" borderColor="gray.400">
          <Stat>
            <StatLabel color="gray.500">Out of Office</StatLabel>
            <StatNumber fontSize="3xl" color="gray.500">{outOfOfficeCount}</StatNumber>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Search Bar & Generate Report Button */}
      <HStack mb={4} spacing={4}>
        <Input 
          bg="white" 
          placeholder="Search for a professor or program..." 
          size="lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          boxShadow="sm"
        />
        {/* === THE NEW REPORT BUTTON === */}
        <Button 
          size="lg" 
          colorScheme="green" 
          px={8} 
          onClick={generateReport}
          boxShadow="sm"
        >
          Generate Report
        </Button>
      </HStack>

      {/* Live Data Table */}
      <TableContainer bg="white" borderRadius="xl" boxShadow="sm" borderWidth="1px">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Faculty Name</Th>
              <Th>Program / Position</Th>
              <Th>Live Status</Th>
              <Th>Current Location</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredFaculty.length > 0 ? (
              filteredFaculty.map((prof) => (
                <Tr key={prof._id} _hover={{ bg: "gray.50" }}>
                  <Td fontWeight="bold">{prof.name}</Td>
                  <Td>{prof.programPosition}</Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(prof.currentStatus)} px={3} py={1} borderRadius="full">
                      {prof.currentStatus.replace(/_/g, ' ')}
                    </Badge>
                  </Td>
                  <Td>{prof.currentLocation || prof.room || 'N/A'}</Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={4} textAlign="center" py={10} color="gray.500">
                  No matching faculty found.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}