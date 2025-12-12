import React from 'react';

export default function DepartmentManagement({ departments = [] }){
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-2">Department Management</h3>
      <div className="overflow-auto max-h-56">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600"><tr><th>Department</th><th>HOD</th><th>Lecturers</th><th>Students</th></tr></thead>
          <tbody>
            {departments.map(d=> (
              <tr key={d.id} className="border-t"><td className="py-2">{d.name}</td><td className="py-2">{d.hod}</td><td className="py-2">{d.lecturers}</td><td className="py-2">{d.students}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
