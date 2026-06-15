import React, { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../../api/axiosInstance';
import '../../students/style/Students.scss';

const FacultyAccounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState({ staffId: '', name: '', password: '' });
    const load = useCallback(async () => setAccounts((await axiosInstance.get('/staff/faculty-coordinators')).data.data), []);
    useEffect(() => {
        axiosInstance.get('/staff/faculty-coordinators').then((response) => setAccounts(response.data.data));
    }, []);
    const create = async (event) => {
        event.preventDefault();
        await axiosInstance.post('/staff/faculty-coordinators', form);
        setForm({ staffId: '', name: '', password: '' });
        load();
    };
    const toggle = async (account) => {
        await axiosInstance.patch(`/staff/faculty-coordinators/${account._id}`, { active: !account.active });
        load();
    };
    return (
        <div className="students-page">
            <div className="page-header-actions"><div className="title-section"><h1>Faculty Coordinators</h1><p>Create and control operational staff accounts.</p></div></div>
            <form onSubmit={create} className="table-container responsive-account-form">
                <input required placeholder="Staff ID" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} />
                <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button className="btn-primary">Create Faculty Coordinator</button>
            </form>
            <div className="table-container"><table className="data-table"><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>
                {accounts.map((account) => <tr key={account._id}><td>{account.adminId}</td><td>{account.name}</td><td>{account.active ? 'Active' : 'Inactive'}</td><td><button className="btn-primary" onClick={() => toggle(account)}>{account.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}
            </tbody></table></div>
        </div>
    );
};
export default FacultyAccounts;
