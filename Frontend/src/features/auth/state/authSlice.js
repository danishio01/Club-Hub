import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null,
    isLoading: false,
    error: null,
    isCheckingAuth: true 
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        loginSuccess: (state, action) => {
            state.isLoading = false;
            state.user = action.payload;
            state.isCheckingAuth = false;
        },
        loginFailure: (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
            state.isCheckingAuth = false;
        },
        updateUserInterests: (state, action) => {
            if (state.user) {
                state.user.interests = action.payload;
            }
        },
        logoutSuccess: (state) => {
            state.user = null;
            state.error = null;
            state.isCheckingAuth = false;
        },
        setAuthChecked: (state) => {
            state.isCheckingAuth = false;
        }
    },
});

export const { loginStart, loginSuccess, loginFailure, updateUserInterests, logoutSuccess, setAuthChecked } = authSlice.actions;
export default authSlice.reducer;