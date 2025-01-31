'use client';

import { useState, useEffect } from 'react';
import { mqttClient, socket } from '@/app/services/mqtt';
import { quizService } from '../../services/quiz';
import type { QuizComment } from '../../components/types/quiz';

interface QuizResultPageProps {
  id: string;
  score: number;
}

export default function QuizResultPage({ id, score }: QuizResultPageProps) {
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ userId: string; userName: string; score: number; timeSpent: number }[]>([]);
  const [comments, setComments] = useState<QuizComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processedMessageIds] = useState(new Set<string>());

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const data = await quizService.getQuizComments(id);
        if (data.data) {
          setComments(Array.isArray(data.data) ? data.data : []);
        }

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        await fetchLeaderboard();
      } catch (error) {
        setError('Failed to fetch initial data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [id]);

  useEffect(() => {
    const topic = `quizzes/${id}/comments`;
    console.log('Setting up real-time updates for quiz:', id);

    // Connect to Socket.IO
    socket.connect();
    socket.emit('joinQuiz', { quizId: id });

    // Subscribe to MQTT topic
    mqttClient.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error('Failed to subscribe to MQTT topic:', err);
      } else {
        console.log('Subscribed to MQTT topic:', topic);
      }
    });

    // MQTT message handler
    const handleMqttMessage = (receivedTopic: string, message: Buffer) => {
      if (receivedTopic === topic) {
        try {
          const update = JSON.parse(message.toString());
          const messageId = update.type + '_' + (update.comment?.id || update.commentId);

          if (processedMessageIds.has(messageId)) {
            console.log('Skipping duplicate message:', messageId);
            return;
          }

          console.log('Processing new message:', messageId);
          processedMessageIds.add(messageId);
          handleCommentUpdate(update);
        } catch (error) {
          console.error('Error processing MQTT message:', error);
        }
      }
    };

    // Socket.IO message handler
    const handleSocketMessage = (update: any) => {
      const messageId = update.type + '_' + (update.comment?.id || update.commentId);
      
      if (processedMessageIds.has(messageId)) {
        console.log('Skipping duplicate socket message:', messageId);
        return;
      }

      console.log('Processing new socket message:', messageId);
      processedMessageIds.add(messageId);
      handleCommentUpdate(update);
    };

    // Add event listeners
    mqttClient.on('message', handleMqttMessage);
    socket.on('commentUpdate', handleSocketMessage);

    // Cleanup
    return () => {
      console.log('Cleaning up connections');
      mqttClient.unsubscribe(topic);
      mqttClient.off('message', handleMqttMessage);
      socket.off('commentUpdate', handleSocketMessage);
      socket.disconnect();
    };
  }, [id, processedMessageIds]);

  const fetchLeaderboard = async () => {
    try {
      if (id) {
        const data = await quizService.getQuizLeaderboard(id);
        if (data.data) {
          const sortedLeaderboard = (data.data as { userId: string; userName: string; score: number; timeSpent: number }[])
            .sort((a, b) => {
              if (a.score === b.score) {
                return a.timeSpent - b.timeSpent;
              }
              return b.score - a.score;
            });
          setLeaderboard(sortedLeaderboard);
        }
      }
    } catch (error) {
      setError('Failed to fetch leaderboard');
    }
  };

  const handleCommentUpdate = (update: any) => {
    if (update.type === 'comment_added') {
      setComments((prevComments) => {
        const exists = prevComments.some(comment => comment.id === update.comment.id);
        if (!exists) {
          console.log('Adding new comment:', update.comment.id);
          return [...prevComments, update.comment];
        }
        console.log('Comment already exists:', update.comment.id);
        return prevComments;
      });
    } else if (update.type === 'comment_deleted') {
      setComments((prevComments) => 
        prevComments.filter((comment) => comment.id !== update.commentId)
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await quizService.deleteQuizComment(id, commentId);
      const mqttMessage = JSON.stringify({
        type: 'comment_deleted',
        commentId: commentId
      });
      
      mqttClient.publish(`quizzes/${id}/comments`, mqttMessage, {
        qos: 1,
        retain: false
      });
    } catch (error) {
      setError('Failed to delete comment');
    }
  };

  const handleCommentSubmit = async () => {
    try {
      if (newComment.trim()) {
        const response = await quizService.addQuizComment(id, newComment);
        
        if (response.error) {
          setError(response.error);
        } else {
          setNewComment('');
          
          const mqttMessage = JSON.stringify({
            type: 'comment_added',
            comment: response.data
          });
          
          mqttClient.publish(`quizzes/${id}/comments`, mqttMessage, {
            qos: 1,
            retain: false
          });
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      setError('Failed to submit comment');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Quiz Result</h1>
      <div className="mb-8">
        <p className="text-xl font-semibold">Your Score: {score}%</p>
      </div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Rank</th>
              <th className="text-left">User</th>
              <th className="text-left">Score</th>
              <th className="text-left">Time Spent</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((result, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{result.userName}</td>
                <td>{result.score}%</td>
                <td>{result.timeSpent} seconds</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-4">Comments</h2>
        {comments.map((comment) => (
          <div key={comment.id} className="mb-4">
            <div className="flex justify-between items-center">
              <p className="font-semibold">{comment.userName}</p>
              <p className="text-sm text-gray-500">{new Date(comment.createdAt).toLocaleString()}</p>
            </div>
            <p>{comment.text}</p>
            {(user?.id === comment.userId || user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <button
                className="mt-2 text-red-600 hover:underline"
                onClick={() => handleDeleteComment(comment.id)}
              >
                Delete
              </button>
            )}
          </div>
        ))}
        <div className="mt-8">
          <textarea
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-600 transition-colors text-gray-800"
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Leave a comment"
          />
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleCommentSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}