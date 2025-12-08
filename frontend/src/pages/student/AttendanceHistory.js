import React from 'react';
import { useGetClassesQuery } from '../../features/apiSlice';

const AttendanceHistory = () => {
  const { data: classes, isLoading } = useGetClassesQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Attendance History</h1>
      <div className="space-y-4">
        {classes?.map((classItem) => (
          <div key={classItem.id} className="border rounded p-4">
            <h2 className="font-semibold">{classItem.course_name}</h2>
            <p>Status: Present</p> {/* This would be fetched from attendance logs */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceHistory;
