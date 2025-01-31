'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { User, UserRole, UserUpdateInput } from '../components/types/auth';
import * as userService from '../services/user';

const profileValidationSchema = Yup.object({
  name: Yup.string()
    .min(3, 'Name must be at least 3 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Email is invalid')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .nullable(),
});

const userManagementValidationSchema = Yup.object({
  email: Yup.string()
    .email('Email is invalid')
    .required('Email is required'),
  role: Yup.string()
    .oneOf(Object.values(UserRole), 'Invalid role')
    .required('Role is required'),
});

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch (err) {
      console.error('Error parsing user data:', err);
      localStorage.removeItem('user');
      router.push('/');
    }
  }, [router]);

  const handleUpdateProfile = async (values: UserUpdateInput) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await userService.updateUser(user.id, values);
      if (error) {
        setError(error);
        setSuccess('');
        return;
      }
      if (data) {
        const updatedUser = { ...user, ...data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setSuccess('Profile updated successfully');
        setError('');
      }
    } catch (err) {
      setError('Failed to update profile');
      setSuccess('');
    }
  };

  const handleUpdateUserRole = async (values: { email: string; role: UserRole }, { resetForm }: { resetForm: () => void }) => {
    if (!user?.role || user.role !== UserRole.ADMIN) return;
    
    try {
      const { error } = await userService.updateUserRole(values.email, { role: values.role });
      if (error) {
        setError(error);
        setSuccess('');
        return;
      }
      setSuccess(`User ${values.email} role updated to ${values.role}`);
      setError('');
      resetForm();
    } catch (err) {
      setError('Failed to update user role');
      setSuccess('');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.email || !window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
    }
    
    setIsDeleting(true);
    try {
        const { error } = await userService.deleteUserByEmail(user.email);
        if (error) {
            setError(error);
            setIsDeleting(false);
            return;
        }
        localStorage.removeItem('user');
        router.push('/');
    } catch (err) {
        setError('Failed to delete account');
        setIsDeleting(false);
    }
    };

  const handleDeleteUserByEmail = async (values: { email: string }, { resetForm }: { resetForm: () => void }) => {
    if (!user?.role || user.role !== UserRole.ADMIN) return;
    
    try {
      const { error } = await userService.deleteUserByEmail(values.email);
      if (error) {
        setError(error);
        setSuccess('');
        return;
      }
      setSuccess(`User ${values.email} deleted successfully`);
      setError('');
      resetForm();
    } catch (err) {
      setError('Failed to delete user');
      setSuccess('');
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-slate-200">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 text-slate-100">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-500 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded text-green-500 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-8">
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Update Profile</h2>
          <Formik
            initialValues={{
              name: user.name || '',
              email: user.email || '',
              password: '',
            }}
            validationSchema={profileValidationSchema}
            onSubmit={handleUpdateProfile}
            enableReinitialize
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-200">
                    Name
                  </label>
                  <Field
                    id="name"
                    name="name"
                    type="text"
                    className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <ErrorMessage name="name" component="div" className="mt-1 text-sm text-red-500" />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                    Email
                  </label>
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-500" />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                    Password
                  </label>
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <ErrorMessage name="password" component="div" className="mt-1 text-sm text-red-500" />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update Profile'}
                </button>
              </Form>
            )}
          </Formik>
        </div>

        {user.role === UserRole.ADMIN && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Update User Role</h2>
              <Formik
                initialValues={{ email: '', role: UserRole.USER }}
                validationSchema={userManagementValidationSchema}
                onSubmit={handleUpdateUserRole}
              >
                {({ isSubmitting }) => (
                  <Form className="space-y-4">
                    <div>
                      <label htmlFor="roleEmail" className="block text-sm font-medium text-slate-200">
                        User Email
                      </label>
                      <Field
                        id="roleEmail"
                        name="email"
                        type="email"
                        className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter user email"
                      />
                      <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-500" />
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-slate-200">
                        New Role
                      </label>
                      <Field
                        as="select"
                        id="role"
                        name="role"
                        className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Object.values(UserRole).map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </Field>
                      <ErrorMessage name="role" component="div" className="mt-1 text-sm text-red-500" />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Updating Role...' : 'Update Role'}
                    </button>
                  </Form>
                )}
              </Formik>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Delete User</h2>
              <Formik
                initialValues={{ email: '' }}
                validationSchema={Yup.object({
                  email: Yup.string()
                    .email('Email is invalid')
                    .required('Email is required'),
                })}
                onSubmit={handleDeleteUserByEmail}
              >
                {({ isSubmitting }) => (
                  <Form className="space-y-4">
                    <div>
                      <label htmlFor="deleteEmail" className="block text-sm font-medium text-slate-200">
                        User Email to Delete
                      </label>
                      <Field
                        id="deleteEmail"
                        name="email"
                        type="email"
                        className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter user email"
                      />
                      <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-500" />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Deleting...' : 'Delete User'}
                    </button>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-500">Danger Zone</h2>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="w-full flex justify-center py-2 px-4 border border-red-500 rounded-md shadow-sm text-sm font-medium text-red-500 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
}