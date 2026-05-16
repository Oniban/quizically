// Login page component
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { loginUser } from '../../services/authService';

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        setLoading(true);
        setServerError('');
        try {
            const response = await loginUser(data);
            login(response);
            navigate('/');
        } catch (error) {
            setServerError(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-colors">
            <h2 className="text-3xl font-bold mb-6 text-center text-indigo-600 dark:text-indigo-400">Login</h2>

            {serverError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {serverError}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm text-white font-medium mb-1">Email Address</label>
                    <input
                        type="email"
                        {...register('email', { required: 'Email is required' })}
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="john@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                    <label className="block text-sm text-white font-medium mb-1">Password</label>
                    <input
                        type="password"
                        {...register('password', { required: 'Password is required' })}
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="••••••••"
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <p className="mt-4 text-center text-white text-sm">
                Don't have an account?{' '}
                <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    Sign up here
                </Link>
            </p>
        </div>
    );
};

export default Login;
