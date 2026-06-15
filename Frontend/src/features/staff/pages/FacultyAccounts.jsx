import React, { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../../api/axiosInstance';
import ConfirmActionModal from '../../events/components/ConfirmActionModal';
import '../../students/style/Students.scss';

const FacultyAccounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState({ staffId: '', name: '', password: '' });
    const [editing, setEditing] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const load = useCallback(async () => setAccounts((await axiosInstance.get('/staff/faculty-coordinators')).data.data), []);
    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);
    const create = async (event) => {
        event.preventDefault();
        await axiosInstance.post('/staff/faculty-coordinators', form);
        setForm({ staffId: '', name: '', password: '' });
        load();
    };
    const saveEdit = async (event) => {
        event.preventDefault();
        await axiosInstance.patch(`/staff/faculty-coordinators/${editing._id}`, { name: editing.name, staffId: editing.adminId });
        setEditing(null);
        load();
    };
    const runConfirm = async () => {
        if (confirm.type === 'delete') await axiosInstance.delete(`/staff/faculty-coordinators/${confirm.account._id}`);
        else await axiosInstance.patch(`/staff/faculty-coordinators/${confirm.account._id}/password`, { password: confirm.password });
        setConfirm(null);
        load();
    };
    return <div className="students-page">
        <div className="page-header-actions"><div className="title-section"><h1>Faculty Coordinators</h1><p>Create, edit, reset, and delete Faculty Coordinator accounts.</p></div></div>
        <form onSubmit={create} className="table-container responsive-account-form">
            <input required placeholder="Staff ID" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} />
            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required minLength="8" type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button className="btn-primary">Create Faculty Coordinator</button>
        </form>
        <div className="table-container"><table className="data-table"><thead><tr><th>ID</th><th>Name</th><th>Actions</th></tr></thead><tbody>
            {accounts.map((account) => <tr key={account._id}><td>{account.adminId}</td><td>{account.name}</td><td className="account-actions">
                <button className="action-icon edit" title="Edit" onClick={() => setEditing(account)}><i className="ri-edit-line"></i></button>
                <button className="action-icon reset" title="Reset password" onClick={() => {
                    const password = window.prompt('Enter a temporary password (8+ characters)');
                    if (password?.length >= 8) setConfirm({ type: 'reset', account, password });
                }}><i className="ri-lock-password-line"></i></button>
                <button className="action-icon delete" title="Delete" onClick={() => setConfirm({ type: 'delete', account })}><i className="ri-delete-bin-line"></i></button>
            </td></tr>)}
        </tbody></table></div>
        {editing && <div className="modal-overlay"><form className="modal-container" onSubmit={saveEdit}><div className="modal-header"><h2>Edit Faculty Coordinator</h2></div><div className="modal-body-scrollable"><input required value={editing.adminId} onChange={(event) => setEditing({ ...editing, adminId: event.target.value })} /><input required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary">Save Changes</button></div></form></div>}
        {confirm && <ConfirmActionModal title={confirm.type === 'delete' ? 'Delete Faculty Coordinator?' : 'Reset Faculty Password?'} message={confirm.type === 'delete' ? `Delete ${confirm.account.name} permanently?` : `Set the new temporary password for ${confirm.account.name}?`} confirmLabel={confirm.type === 'delete' ? 'Delete' : 'Reset Password'} danger={confirm.type === 'delete'} onClose={() => setConfirm(null)} onConfirm={runConfirm} />}
    </div>;
};
export default FacultyAccounts;
