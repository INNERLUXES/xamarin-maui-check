using Xamarin.Forms;

namespace BrightwellNotes
{
    public partial class App : Application
    {
        public App()
        {
            InitializeComponent();
            MainPage = new NavigationPage(new NotesPage());
        }
    }
}
