import { type LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { getCustomer } from "../utils/customer-auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const customer = await getCustomer(request);
  const url = new URL(request.url);
  const type = url.searchParams.get("type"); // "start" or "end"
  const error = url.searchParams.get("error");

  return ({
    customer,
    type,
    error,
  });
};

export default function ChallengeSuccess() {
  const { customer, type, error } = useLoaderData<typeof loader>();

  if (error) {
    return (
      <div className="success-container">
        <div className="error-card">
          <div className="icon error-icon">❌</div>
          <h1>Oops!</h1>
          <p className="message">{error}</p>
          <div className="actions">
            <Link to="/customer/challenge/start" className="btn btn-primary">
              Go to Start Form
            </Link>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (type === "start") {
    return (
      <div className="success-container">
        <div className="success-card">
          <div className="icon success-icon">🎉</div>
          <h1>Challenge Started!</h1>
          <p className="message">
            Congratulations, {customer?.firstName || "there"}! You've successfully started your weight loss challenge.
          </p>
          <p className="sub-message">
            Your starting photos and weight have been recorded. Keep up the great work!
          </p>
          <div className="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li>Stay committed to your goals</li>
              <li>Track your progress regularly</li>
              <li>Come back when you're ready to complete the challenge</li>
            </ul>
          </div>
          <div className="actions">
            <Link to="/customer/challenge/end" className="btn btn-primary">
              Complete Challenge →
            </Link>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (type === "end") {
    return (
      <div className="success-container">
        <div className="success-card">
          <div className="icon success-icon">🏆</div>
          <h1>Challenge Completed!</h1>
          <p className="message">
            Amazing work, {customer?.firstName || "there"}! You've successfully completed your weight loss challenge!
          </p>
          <p className="sub-message">
            Your transformation has been recorded. We're proud of your dedication and hard work!
          </p>
          <div className="celebration">
            <p>🎊 You did it! 🎊</p>
          </div>
          <div className="next-steps">
            <h3>What Now?</h3>
            <ul>
              <li>Celebrate your achievement!</li>
              <li>Check with the store for any rewards or recognition</li>
              <li>Consider joining the next challenge to keep your momentum</li>
            </ul>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="success-container">
      <div className="success-card">
        <h1>Weight Loss Challenge</h1>
        <p>Welcome to the challenge portal!</p>
        <div className="actions">
          <Link to="/customer/challenge/start" className="btn btn-primary">
            Start Challenge
          </Link>
          <Link to="/customer/challenge/end" className="btn btn-secondary">
            Complete Challenge
          </Link>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .success-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .success-card,
  .error-card {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    max-width: 600px;
    text-align: center;
  }

  .icon {
    font-size: 80px;
    margin-bottom: 20px;
    animation: bounce 1s ease-in-out;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }

  h1 {
    font-size: 32px;
    color: #333;
    margin-bottom: 15px;
  }

  .message {
    font-size: 18px;
    color: #555;
    margin-bottom: 10px;
    line-height: 1.6;
  }

  .sub-message {
    font-size: 16px;
    color: #777;
    margin-bottom: 30px;
  }

  .celebration {
    font-size: 24px;
    margin: 20px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .next-steps {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: left;
  }

  .next-steps h3 {
    margin-top: 0;
    color: #333;
  }

  .next-steps ul {
    margin: 10px 0 0 20px;
    padding: 0;
  }

  .next-steps li {
    margin: 8px 0;
    color: #555;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 30px;
  }

  .btn {
    padding: 12px 30px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px;
    transition: all 0.3s;
    display: inline-block;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-2px);
  }

  .error-card {
    border-top: 4px solid #dc3545;
  }

  .error-icon {
    color: #dc3545;
  }

  .success-icon {
    color: #28a745;
  }

  @media (max-width: 600px) {
    .success-card,
    .error-card {
      padding: 30px 20px;
    }

    h1 {
      font-size: 24px;
    }

    .message {
      font-size: 16px;
    }

    .actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
`;
