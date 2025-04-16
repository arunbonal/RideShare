import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsAndConditions: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/profile/settings"
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all mb-6 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Link>
        
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Terms and Conditions</h1>

          <div className="prose max-w-none text-gray-700">
            <p className="mb-4">
              Last Updated: 16/04/2025
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
            <p>
              Welcome to RideShare ("we," "our," or "us"). These Terms and Conditions govern your use of the RideShare application and services (collectively, the "Service"). By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. Definitions</h2>
            <p><strong>"User"</strong>: Any individual who accesses or uses the Service, including Drivers and Hitchhikers.</p>
            <p><strong>"Driver"</strong>: A User who offers rides through the Service.</p>
            <p><strong>"Hitchhiker"</strong>: A User who requests or accepts rides through the Service.</p>
            <p><strong>"Ride"</strong>: The transportation service provided by a Driver to a Hitchhiker.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. Eligibility</h2>
            <p>To use the Service, you must:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Be at least 18 years of age</li>
              <li>Be a PES University student with a valid PES University email (@pesu.pes.edu)</li>
              <li>If registering as a Driver, possess a valid Indian driving license and vehicle registration documentation</li>
              <li>Provide accurate, current, and complete information</li>
              <li>Not be prohibited from receiving services under applicable laws</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. Account Registration</h2>
            <p>
              You must register for an account using your PES University email. You agree to maintain the confidentiality of your account information and are fully responsible for all activities that occur under your account.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. User Obligations</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">5.1 General Obligations</h3>
            <p>Users shall:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Comply with all applicable laws and regulations</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not engage in any activity that may harm, disrupt, or interfere with the Service</li>
              <li>Not attempt to gain unauthorized access to any part of the Service</li>
              <li>Not use the Service for commercial purposes</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">5.2 Driver Obligations</h3>
            <p>Drivers shall:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Maintain a valid driving license and vehicle registration</li>
              <li>Maintain appropriate insurance coverage as required by law</li>
              <li>Ensure their vehicle is in safe operating condition</li>
              <li>Not consume alcohol or drugs before or during a Ride</li>
              <li>Drive safely and comply with all traffic rules and regulations</li>
              <li>Treat Hitchhikers with respect and courtesy</li>
              <li>Arrive at the agreed pickup location on time</li>
              <li>Follow the agreed-upon route unless mutually agreed otherwise</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">5.3 Hitchhiker Obligations</h3>
            <p>Hitchhikers shall:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Be at the agreed pickup location on time</li>
              <li>Treat Drivers with respect and courtesy</li>
              <li>Not engage in disruptive or dangerous behavior during a Ride</li>
              <li>Not request Drivers to violate traffic laws or regulations</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Service Description</h2>
            <p>
              RideShare provides a platform that connects Drivers and Hitchhikers for shared rides between locations. The Service facilitates ride matching between users within the PES University community. RideShare does not provide transportation services and is not a transportation carrier.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. Cancellation Policy</h2>
            <p>
              Users may cancel rides subject to the cancellation terms specified in the Service. Repeated cancellations may result in penalties or service restrictions.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, RideShare shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, arising out of or in connection with your use of the Service.
            </p>
            <p>
              RideShare does not guarantee the quality, safety, suitability, or availability of Drivers or their vehicles. Users acknowledge and accept the risks associated with transportation services.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">9. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless RideShare and its officers, directors, employees, and agents from and against all claims, liabilities, damages, losses, costs, expenses, and fees (including reasonable attorneys' fees) arising from or relating to your use of the Service or violation of these Terms.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">10. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are owned by RideShare and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any material from the Service without prior written consent.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">11. Dispute Resolution</h2>
            <p>
              Any disputes arising out of or related to these Terms or the Service shall be resolved through amicable negotiation. If the dispute cannot be resolved through negotiation, it shall be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996 of India. The arbitration shall take place in Bangalore, Karnataka, India.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Subject to the dispute resolution provisions, the courts of Bangalore, Karnataka, India shall have exclusive jurisdiction over any disputes arising out of these Terms.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">13. Modification of Terms</h2>
            <p>
              RideShare reserves the right to modify these Terms at any time. We will notify users of any material changes by posting the updated Terms on the Service and updating the "Last Updated" date. Your continued use of the Service after such modifications constitutes your acceptance of the revised Terms.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">14. Termination</h2>
            <p>
              RideShare may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-3">15. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
              <br />
              <a href="mailto:rideshare.pesu@gmail.com" className="text-blue-600 hover:underline">
                rideshare.pesu@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions; 