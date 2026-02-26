import React, { useState } from 'react';

const AdminSettings = () => {
    const [freeboxAddress, setFreeboxAddress] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFreeboxAddress(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isValidAddress(freeboxAddress)) {
            setError('Please enter a valid Freebox server address.');
            return;
        }
        setError('');
        // Add code to store the address (e.g., API call or local storage)
        console.log('Freebox Server Address:', freeboxAddress);
    };

    const isValidAddress = (address) => {
        // Add your validation logic here (e.g., regex for address format)
        return true; // Placeholder, replace with actual validation
    };

    return (
        <div>
            <h2>Admin Settings</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        Freebox Server Address:
                        <input type="text" value={freeboxAddress} onChange={handleChange} required />
                    </label>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Save</button>
            </form>
        </div>
    );
};

export default AdminSettings;