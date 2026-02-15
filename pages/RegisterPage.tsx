import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { useAuth } from '../context/AuthContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password should be at least 6 characters');
    }

    try {
      setError('');
      setIsLoading(true);
      await signup(formData.email, formData.password, formData.name);
      navigate('/');
    } catch (err: any) {
      setError('Failed to create an account. ' + (err.message || ''));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent z-0" />
      <div className="absolute top-[-20%] right-[10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-2xl border border-slate-700/50 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/20 rounded-xl mb-4 text-accent">
            <Zap className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-slate-400">Join the Pingra community today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            name="name"
            type="text"
            placeholder="John Doe"
            label="Full Name"
            value={formData.name}
            onChange={handleChange}
            icon={<User className="w-5 h-5" />}
            required
          />

          <Input
            name="email"
            type="email"
            placeholder="name@example.com"
            label="Email Address"
            value={formData.email}
            onChange={handleChange}
            icon={<Mail className="w-5 h-5" />}
            required
          />
          
          <Input
            name="password"
            type="password"
            placeholder="••••••••"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            icon={<Lock className="w-5 h-5" />}
            required
          />

          <Input
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            icon={<Lock className="w-5 h-5" />}
            required
          />

          <div className="pt-2">
            <Button type="submit" fullWidth isLoading={isLoading} className="bg-gradient-to-r from-primary to-indigo-600 hover:from-indigo-500 hover:to-indigo-700">
              Create Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-indigo-400 font-medium">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;