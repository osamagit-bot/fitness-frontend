
const HelpSupport = () => {
  return (
    <section className="min-h-screen bg-gray-900 pt-36 text-white py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-yellow-400 mb-6 text-center">
          Help & Support
        </h2>
        <p className="text-gray-300 text-center mb-12">
          We're here to help! Find answers to your questions, or reach out to our support team.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* FAQ Section */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold text-yellow-300 mb-4">Frequently Asked Questions</h3>
            <ul className="space-y-4 text-gray-300">
              <li>
                <strong>❓ How do I reset my password?</strong><br />
                You can contact Admin or you can reset your password in your member dashboard 'settings' tab.
              </li>
              <li>
                <strong>❓ How can I update my membership?</strong><br />
                Visit the Membership section under your profile or contact our staff at the front desk.
              </li>
              <li>
                <strong>❓ What should I bring to the gym?</strong><br />
                Bring a towel, water bottle, clean shoes, and your membership card or app.
              </li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold text-yellow-300 mb-4">Need More Help?</h3>
            <p className="text-gray-300 mb-4">
              Our support team is available to assist you 7 days a week. Contact us via:
            </p>
            <ul className="text-gray-300 space-y-2">
              <li><strong>Email:</strong> <a href="mailto:support@gymfitness.com" className="text-yellow-400">atalan@gymfitness.com</a></li>
              <li><strong>Phone:</strong> <span className="text-yellow-400">+93 700 000 000</span></li>
              <li><strong>Live Chat:</strong> Available on the bottom-right corner</li>
            </ul>
            <a
              href="https://wa.me/93700000000"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block bg-yellow-400 text-gray-900 font-semibold px-6 py-2 rounded hover:bg-yellow-300 transition"
            >
              Chat with Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HelpSupport;
