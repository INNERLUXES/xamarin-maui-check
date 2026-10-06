using TidewaterDriver.Views;
using Xamarin.Forms;
using Xamarin.Forms.Xaml;

[assembly: XamlCompilation(XamlCompilationOptions.Compile)]

namespace TidewaterDriver
{
    public partial class App : Application
    {
        public App()
        {
            InitializeComponent();
            MainPage = new NavigationPage(new DeliveryPage());
        }

        protected override void OnSleep()
        {
            Properties["lastScreen"] = "delivery";
        }
    }
}
