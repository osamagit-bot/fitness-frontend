# test_webauthn.py
from webauthn import verify_registration_response
import inspect

def main():
    print("WebAuthn API Investigation")
    print("========================")
    
    # Print the function signature
    sig = inspect.signature(verify_registration_response)
    print(f"Function signature: {sig}")
    
    # Print each parameter and its details
    print("\nParameters:")
    for name, param in sig.parameters.items():
        print(f"- {name}: {param.kind} (default: {param.default if param.default is not param.empty else 'required'})")
    
    print("\nUsage example based on signature:")
    args = [f"{name}=value" for name in sig.parameters.keys()]
    print(f"verify_registration_response({', '.join(args)})")

if __name__ == "__main__":
    main()