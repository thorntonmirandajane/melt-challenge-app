import { type LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { getCustomer } from "../utils/customer-auth.server";
import { getCustomizationSettings } from "../utils/customization.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const customer = await getCustomer(request);
  const url = new URL(request.url);
  const type = url.searchParams.get("type"); // "start" or "end"
  const error = url.searchParams.get("error");

  // Get shop from customer or use default
  const shop = customer?.shop || "bowmar-nutrition-test.myshopify.com";
  const settings = await getCustomizationSettings(shop);

  return ({
    customer,
    type,
    error,
    settings,
  });
};

export default function ChallengeSuccess() {
  const { customer, type, error, settings } = useLoaderData<typeof loader>();

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
        <style>{getStyles(settings)}</style>
      </div>
    );
  }

  if (type === "start") {
    return (
      <div className="success-container">
        <div className="success-card">
          <div className="icon success-icon">🎉</div>
          <h1>{settings.successStartTitle}</h1>
          <p className="message">
            {settings.successStartMessage || `Congratulations, ${customer?.firstName || "there"}! You've successfully started your weight loss challenge.`}
          </p>
          {settings.successStartSubMessage && (
            <p className="sub-message">{settings.successStartSubMessage}</p>
          )}
          {!settings.successStartSubMessage && (
            <p className="sub-message">
              Your starting photos and weight have been recorded. Keep up the great work!
            </p>
          )}
          <div className="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li>Stay committed to your goals</li>
              <li>Track your progress regularly</li>
              <li>Come back when you're ready to complete the challenge</li>
            </ul>
          </div>
        </div>
        <style>{getStyles(settings)}</style>
      </div>
    );
  }

  if (type === "end") {
    return (
      <div className="success-container">
        <div className="success-card">
          <div className="icon success-icon">🏆</div>
          <h1>{settings.successEndTitle}</h1>
          <p className="message">
            {settings.successEndMessage || `Amazing work, ${customer?.firstName || "there"}! You've successfully completed your weight loss challenge!`}
          </p>
          {settings.successEndSubMessage && (
            <p className="sub-message">{settings.successEndSubMessage}</p>
          )}
          {!settings.successEndSubMessage && (
            <p className="sub-message">
              Your transformation has been recorded. We're proud of your dedication and hard work!
            </p>
          )}
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
        <style>{getStyles(settings)}</style>
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
      <style>{getStyles(settings)}</style>
    </div>
  );
}

const getStyles = (settings: any) => `
  .success-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%);
    padding: 20px;
    font-family: 'Futura', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .success-card,
  .error-card {
    background: ${settings.backgroundColor};
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
    color: ${settings.primaryColor};
    margin-bottom: 15px;
  }

  .message {
    font-size: 18px;
    color: ${settings.textColor};
    margin-bottom: 10px;
    line-height: 1.6;
  }

  .sub-message {
    font-size: 16px;
    color: ${settings.textColor};
    margin-bottom: 30px;
    opacity: 0.8;
  }

  .celebration {
    font-size: 24px;
    margin: 20px 0;
    padding: 15px;
    background: ${settings.inputBackgroundColor};
    border-radius: 8px;
  }

  .next-steps {
    background: ${settings.inputBackgroundColor};
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: left;
  }

  .next-steps h3 {
    margin-top: 0;
    color: ${settings.primaryColor};
  }

  .next-steps ul {
    margin: 10px 0 0 20px;
    padding: 0;
  }

  .next-steps li {
    margin: 8px 0;
    color: ${settings.textColor};
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
    background: ${settings.buttonColor};
    color: white;
  }

  .btn-primary:hover {
    background: ${settings.buttonHoverColor};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: ${settings.secondaryColor};
    color: white;
  }

  .btn-secondary:hover {
    background: ${settings.primaryColor};
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
